/**
 * @format
 * MQTT Service for Farmer App Motor Control
 *
 * Topic schema: GRC_SMARTHIKA_SPI_VI_V3 — Payload Reference v2.1
 * Broker: AWS IoT Core (ap-south-1) | Protocol: MQTT 3.1.1 over TLS
 *
 *  SUBSCRIBE (device → cloud)
 *    gw/{gw_id}/telemetry   QoS 1  every 5 s / 10 s
 *    gw/{gw_id}/status      QoS 1  on motor state-change
 *    gw/{gw_id}/health      QoS 0  boot + hourly
 *    gw/{gw_id}/error       QoS 1  on fault
 *    gw/{gw_id}/response    QoS 1  ACK/NACK per command
 *    nodes/{node_id}/env    QoS 0  LoRa forwarded
 *    valves/{valve_id}/status QoS 1 on valve change
 *  PUBLISH (cloud → device)
 *    gw/{gw_id}/cmd         QoS 1
 */

import mqtt from 'mqtt';
import AWS from 'aws-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MQTT_CONFIG,
  generateGatewayTopic,
  generateNodeTopic,
  generateValveTopic,
  MOTOR_COMMANDS,
  MOTOR_STATES,
  MESSAGE_TYPES,
  PAYLOAD_VERSION,
} from '../../config/mqttConfig';

class MQTTService {
    static instance = null;

    constructor() {
        if (MQTTService.instance) return MQTTService.instance;

        this.client = null;
        this.callbacks = [];
        this.subscribedTopics = new Set();
        this.isConnected = false;
        this.isConnecting = false;
        
        // MQTT Configuration from config file
        this.config = MQTT_CONFIG;
        
        // Connection Management
        this.reconnectInterval = null;
        this.maxReconnectAttempts = this.config.connection.maxReconnectAttempts;
        this.reconnectAttempts = 0;
        this.reconnectDelay = this.config.connection.reconnectDelay;
        
        // Motor State Management
        this.motorState = {
            isOn: false,
            lastUpdated: null,
            status: 'unknown'
        };

        MQTTService.instance = this;
    }

    /**
     * Generate AWS SigV4 presigned WebSocket URL for AWS IoT Core
     * Following the exact AWS IoT documentation signing process
     */
    getSignedUrl(endpoint, region, accessKeyId, secretAccessKey, sessionToken) {
        const crypto = require('crypto-browserify');

        const host = endpoint;
        const path = '/mqtt';
        const service = 'iotdevicegateway';
        const algorithm = 'AWS4-HMAC-SHA256';

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.[0-9]{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);

        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

        // Build canonical query string — DO NOT include Security-Token here for IoT
        // It gets added after the signature
        let canonicalQuerystring = `X-Amz-Algorithm=${algorithm}`;
        canonicalQuerystring += `&X-Amz-Credential=${encodeURIComponent(accessKeyId + '/' + credentialScope)}`;
        canonicalQuerystring += `&X-Amz-Date=${amzDate}`;
        canonicalQuerystring += `&X-Amz-SignedHeaders=host`;

        // Create canonical request
        const canonicalHeaders = `host:${host}\n`;
        const payloadHash = crypto.createHash('sha256').update('').digest('hex');
        const canonicalRequest = `GET\n${path}\n${canonicalQuerystring}\n${canonicalHeaders}\nhost\n${payloadHash}`;

        // Create string to sign
        const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
        const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

        // Calculate signing key
        const kDate = crypto.createHmac('sha256', 'AWS4' + secretAccessKey).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
        const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

        // Calculate signature
        const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

        // Build final signed URL — add signature first, THEN session token
        let finalUrl = `wss://${host}${path}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
        if (sessionToken) {
            finalUrl += `&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`;
        }

        return finalUrl;
    }

    /**
     * Initialize MQTT connection with AWS IoT Core credentials
     */
    async initialize() {
        if (this.isConnecting) {
            console.log('Already attempting to connect to MQTT...');
            return;
        }

        this.isConnecting = true;
        
        try {
            // Clear any existing connection
            if (this.client) {
                await this.disconnect();
            }

            console.log('Initializing MQTT connection to AWS IoT Core...', {
                region: this.config.broker.region,
                endpoint: this.config.broker.iotEndpoint
            });
            
            // Configure AWS SDK
            AWS.config.region = this.config.broker.region;
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: this.config.broker.identityPoolId,
            });

            // Get AWS credentials
            await AWS.config.credentials.getPromise();

            console.log('AWS credentials obtained successfully', {
                hasAccessKey: !!AWS.config.credentials.accessKeyId,
                hasSecretKey: !!AWS.config.credentials.secretAccessKey,
                hasSessionToken: !!AWS.config.credentials.sessionToken,
            });

            // Generate unique client ID
            const clientId = `${this.config.auth.clientIdPrefix}-${Math.random().toString(16).slice(2)}`;

            // Generate SigV4 presigned WebSocket URL
            const signedUrl = this.getSignedUrl(
                this.config.broker.iotEndpoint,
                this.config.broker.region,
                AWS.config.credentials.accessKeyId,
                AWS.config.credentials.secretAccessKey,
                AWS.config.credentials.sessionToken
            );

            console.log('AWS IoT WebSocket URL signed successfully');

            const options = {
                clientId: clientId,
                protocolVersion: 4,
                keepalive: this.config.connection.keepalive,
                clean: this.config.connection.clean,
                connectTimeout: this.config.connection.connectTimeout,
                reconnectPeriod: 0, // Disable mqtt.js auto-reconnect, we handle it ourselves with fresh credentials
            };

            console.log('Connecting to AWS IoT Core with clientId:', clientId);

            this.client = mqtt.connect(signedUrl, options);
            this.setupEventHandlers();
        } catch (err) {
            console.error('MQTT initialization error:', err);
            this.isConnecting = false;
            this.handleConnectionLoss();
        }
    }

    /**
     * Setup MQTT event handlers
     */
    setupEventHandlers() {
        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.isConnected = false;
            this.isConnecting = false;
            this.handleConnectionLoss();
        });

        this.client.on('error', (error) => {
            console.log('MQTT error details:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                hostname: error.hostname,
                port: error.port,
                stack: error.stack
            });
            this.isConnected = false;
            this.isConnecting = false;
            this.handleConnectionLoss();
        });

        this.client.on('message', (topic, message) => {
            console.log('MQTT message received:', { topic, message: message.toString() });
            this.processMessage({ topic, data: message.toString() });
        });

        this.client.on('connect', (connack) => {
            console.log('MQTT connected successfully to AWS IoT Core:', {
                sessionPresent: connack.sessionPresent,
                returnCode: connack.returnCode
            });
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            
            // Clear any existing reconnect timer
            if (this.reconnectInterval) {
                clearTimeout(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            
            // Subscribe to motor topics
            console.log('Connection stable, subscribing to motor topics...');
            this.subscribeToMotorTopics();
        });

        this.client.on('disconnect', (packet) => {
            console.log('MQTT disconnected:', packet);
            this.isConnected = false;
            this.isConnecting = false;
        });

        this.client.on('offline', () => {
            console.log('MQTT client went offline');
            this.isConnected = false;
            this.isConnecting = false;
        });

        this.client.on('reconnect', () => {
            console.log('MQTT client attempting to reconnect...');
        });
    }

    /**
     * Subscribe to all device → cloud topics (v2.1 schema)
     */
    async subscribeToMotorTopics() {
        try {
            const { gateway } = this.config.topics;
            const topicList = [
                { topic: generateGatewayTopic(gateway.telemetry), qos: this.config.qos.telemetry },
                { topic: generateGatewayTopic(gateway.status),    qos: this.config.qos.status    },
                { topic: generateGatewayTopic(gateway.health),    qos: this.config.qos.health    },
                { topic: generateGatewayTopic(gateway.error),     qos: this.config.qos.error     },
                { topic: generateGatewayTopic(gateway.response),  qos: this.config.qos.response  },
            ];

            for (const { topic, qos } of topicList) {
                await this.subscribeToTopicWithQoS(topic, qos);
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            console.log('Successfully subscribed to all v2.1 gateway topics');
        } catch (error) {
            console.error('Error subscribing to motor topics:', error);
        }
    }

    /**
     * Subscribe to a specific topic with explicit QoS
     */
    async subscribeToTopicWithQoS(topic, qos = 1) {
        if (!this.client || !this.isConnected) {
            console.log(`Cannot subscribe to ${topic}: client=${!!this.client}, connected=${this.isConnected}`);
            return;
        }

        if (this.subscribedTopics.has(topic)) {
            console.log(`Already subscribed to topic: ${topic}`);
            return;
        }

        try {
            console.log(`Subscribing to topic: ${topic} (QoS ${qos})`);
            this.client.subscribe(topic, { qos }, (error) => {
                if (error) {
                    console.error(`Error subscribing to topic ${topic}:`, error);
                } else {
                    this.subscribedTopics.add(topic);
                    console.log(`Successfully subscribed to topic: ${topic}`);
                }
            });
        } catch (error) {
            console.error(`Error subscribing to topic ${topic}:`, error);
        }
    }

    /** @deprecated — kept for backwards compatibility; prefer generateGatewayTopic() directly */
    subscribeToTopic(topic) {
        return this.subscribeToTopicWithQoS(topic, 1);
    }

    /**
     * Return the publish topic for cloud → device commands
     */
    getCmdTopic() {
        return generateGatewayTopic(this.config.topics.gateway.cmd);
    }

    /**
     * Send PUMP_START command  (cloud → device, gw/{gw_id}/cmd)
     */
    async turnMotorOn() {
        const command = {
            cmd: MOTOR_COMMANDS.PUMP_START,
            target: this.config.topics.gatewayId,
            params: {},
            ts: new Date().toISOString(),
        };

        const topic = this.getCmdTopic();

        try {
            await this.publishMessage(topic, JSON.stringify(command), this.config.qos.cmd);

            // Optimistic local state — real confirmation comes via gw/{gw_id}/status
            this.motorState.lastUpdated = new Date().toISOString();
            await this.saveMotorState();

            console.log('PUMP_START command sent:', topic);
            this.notifyListeners({ type: MESSAGE_TYPES.MOTOR_COMMAND, action: 'on', success: true });
            return true;
        } catch (error) {
            console.error('Error sending PUMP_START:', error);
            this.notifyListeners({ type: MESSAGE_TYPES.MOTOR_COMMAND, action: 'on', success: false, error });
            throw error;
        }
    }

    /**
     * Send PUMP_STOP command  (cloud → device, gw/{gw_id}/cmd)
     */
    async turnMotorOff() {
        const command = {
            cmd: MOTOR_COMMANDS.PUMP_STOP,
            target: this.config.topics.gatewayId,
            params: {},
            ts: new Date().toISOString(),
        };

        const topic = this.getCmdTopic();

        try {
            await this.publishMessage(topic, JSON.stringify(command), this.config.qos.cmd);

            // Optimistic local state — real confirmation comes via gw/{gw_id}/status
            this.motorState.lastUpdated = new Date().toISOString();
            await this.saveMotorState();

            console.log('PUMP_STOP command sent:', topic);
            this.notifyListeners({ type: MESSAGE_TYPES.MOTOR_COMMAND, action: 'off', success: true });
            return true;
        } catch (error) {
            console.error('Error sending PUMP_STOP:', error);
            this.notifyListeners({ type: MESSAGE_TYPES.MOTOR_COMMAND, action: 'off', success: false, error });
            throw error;
        }
    }

    /**
     * Request latest motor status.
     * In v2.1 the device publishes status on-change; there is no explicit GET_STATUS command.
     * This is kept as a no-op stub so callsites don't break.
     */
    async getMotorStatus() {
        console.log('getMotorStatus: status is pushed by device on-change (v2.1), no poll command needed.');
        return true;
    }

    /**
     * Send an arbitrary v2.1 command to the gateway
     * @param {string} cmd   — one of MOTOR_COMMANDS values
     * @param {object} params
     */
    async sendCommand(cmd, params = {}) {
        const payload = {
            cmd,
            target: this.config.topics.gatewayId,
            params,
            ts: new Date().toISOString(),
        };
        const topic = this.getCmdTopic();
        await this.publishMessage(topic, JSON.stringify(payload), this.config.qos.cmd);
        console.log(`Command [${cmd}] sent to ${topic}`);
    }

    /**
     * Publish message to a topic
     */
    async publishMessage(topic, message, qos = 1) {
        if (!this.client || !this.isConnected) {
            throw new Error('MQTT client not connected');
        }

        return new Promise((resolve, reject) => {
            try {
                console.log(`Publishing to ${topic}: ${message}`);
                this.client.publish(topic, message, { qos }, (error) => {
                    if (error) {
                        console.error(`Error publishing to topic ${topic}:`, error);
                        reject(error);
                    } else {
                        console.log(`Successfully published to topic: ${topic}`);
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error(`Error publishing to topic ${topic}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Process incoming MQTT messages
     */
    async processMessage(msg) {
        try {
            const { topic, data } = msg;
            const messageData = data.toString();
            
            console.log(`Processing MQTT message from topic ${topic}: ${messageData}`);
            
            // Parse JSON message
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(messageData);
            } catch (parseError) {
                console.log('Message is not JSON, treating as plain text:', messageData);
                parsedMessage = { raw: messageData };
            }

            // Route by v2.1 topic namespace
            if (topic.startsWith('valves/')) {
                // valves/{valve_id}/status
                this.handleValveStatusMessage(parsedMessage);
            } else if (topic.startsWith('nodes/')) {
                // nodes/{node_id}/env
                this.handleNodeEnvMessage(parsedMessage);
            } else if (topic.includes('/telemetry')) {
                // gw/{gw_id}/telemetry
                this.handleTelemetryMessage(parsedMessage);
            } else if (topic.includes('/status')) {
                // gw/{gw_id}/status
                this.handleStatusMessage(parsedMessage);
            } else if (topic.includes('/error')) {
                // gw/{gw_id}/error
                this.handleErrorMessage(parsedMessage);
            } else if (topic.includes('/health')) {
                // gw/{gw_id}/health
                this.handleHealthMessage(parsedMessage);
            } else if (topic.includes('/response')) {
                // gw/{gw_id}/response
                this.handleResponseMessage(parsedMessage);
            }

            // Notify all listeners
            this.notifyListeners({
                type: MESSAGE_TYPES.MQTT_MESSAGE,
                topic,
                message: parsedMessage,
                raw: messageData
            });

        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    }

    /**
     * Handle gw/{gw_id}/status  — v2.1 payload
     * { v, ts, motor: { st, active }, mode, trigger }
     */
    handleStatusMessage(message) {
        console.log('Received status message (v2.1):', message);

        const motorSt = message?.motor?.st;
        if (motorSt !== undefined) {
            const isOn = motorSt === MOTOR_STATES.RUNNING_STAR ||
                         motorSt === MOTOR_STATES.RUNNING_DELTA;
            this.motorState.isOn    = isOn;
            this.motorState.status  = motorSt;
            this.motorState.lastUpdated = new Date().toISOString();
            this.saveMotorState();
        }

        this.notifyListeners({ type: MESSAGE_TYPES.MOTOR_STATUS, status: message });
    }

    /**
     * Handle gw/{gw_id}/telemetry  — v2.1 payload
     * { v, ts, el: {...}, hy: {...}, m: {...} }
     */
    handleTelemetryMessage(message) {
        console.log('Received telemetry message (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.TELEMETRY, telemetry: message });
    }

    /**
     * Handle gw/{gw_id}/error  — v2.1 payload
     * { v, ts, code, sev, desc, snap: { v, i, f } }
     */
    handleErrorMessage(message) {
        console.log('Received fault/error message (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.ERROR, error: message });
    }

    /**
     * Handle gw/{gw_id}/health  — v2.1 payload
     */
    handleHealthMessage(message) {
        console.log('Received health message (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.HEALTH, health: message });
    }

    /**
     * Handle gw/{gw_id}/response  — ACK/NACK
     */
    handleResponseMessage(message) {
        console.log('Received command response (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.RESPONSE, response: message });
    }

    /**
     * Handle nodes/{node_id}/env  — LoRa forwarded soil/env data
     */
    handleNodeEnvMessage(message) {
        console.log('Received node env message (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.NODE_ENV, env: message });
    }

    /**
     * Handle valves/{valve_id}/status  — v2.1 payload
     */
    handleValveStatusMessage(message) {
        console.log('Received valve status message (v2.1):', message);
        this.notifyListeners({ type: MESSAGE_TYPES.VALVE_STATUS, status: message });
    }

    /**
     * Save motor state to AsyncStorage
     */
    async saveMotorState() {
        try {
            await AsyncStorage.setItem('motorState', JSON.stringify(this.motorState));
        } catch (error) {
            console.error('Error saving motor state:', error);
        }
    }

    /**
     * Load motor state from AsyncStorage
     */
    async loadMotorState() {
        try {
            const savedState = await AsyncStorage.getItem('motorState');
            if (savedState) {
                this.motorState = JSON.parse(savedState);
            }
        } catch (error) {
            console.error('Error loading motor state:', error);
        }
    }

    /**
     * Get current motor state
     */
    getMotorState() {
        return this.motorState;
    }

    /**
     * Handle connection loss and attempt reconnection
     */
    async handleConnectionLoss() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached. Stopping reconnection.');
            return;
        }

        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`Attempting to reconnect MQTT in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectInterval = setTimeout(async () => {
            try {
                await this.initialize();
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, delay);
    }

    /**
     * Add a message listener
     */
    addListener(callback) {
        if (typeof callback === 'function' && !this.callbacks.includes(callback)) {
            this.callbacks.push(callback);
        }
    }

    /**
     * Remove a message listener
     */
    removeListener(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(event) {
        this.callbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in MQTT listener callback:', error);
            }
        });
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Disconnect from MQTT broker
     */
    async disconnect() {
        if (this.client) {
            try {
                this.client.end();
                this.isConnected = false;
                this.subscribedTopics.clear();
                console.log('MQTT disconnected');
            } catch (error) {
                console.error('Error disconnecting MQTT:', error);
            }
        }
        
        // Clear reconnection timer
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        // Reset connection state
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
    }
}

export default new MQTTService();
