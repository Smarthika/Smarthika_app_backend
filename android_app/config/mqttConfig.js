/**
 * MQTT Configuration for Farmer App
 *
 * Topic schema: GRC_SMARTHIKA_SPI_VI_V3 — Payload Reference v3.0
 * Broker: AWS IoT Core (ap-south-1) | Protocol: MQTT 3.1.1 over TLS
 *
 * Topic namespaces
 *   gw/{farm_id}/{gw_id}/telemetry   — Device → Cloud  | QoS 1 | Every 5 s (run) / 10 s (idle)
 *   gw/{farm_id}/{gw_id}/status      — Device → Cloud  | QoS 1 | On motor state-change
 *   gw/{farm_id}/{gw_id}/health      — Device → Cloud  | QoS 0 | Boot + hourly
 *   gw/{farm_id}/{gw_id}/error       — Device → Cloud  | QoS 1 | On fault only
 *   gw/{farm_id}/{gw_id}/response    — Device → Cloud  | QoS 1 | ACK/NACK per command
 *   gw/{farm_id}/{gw_id}/ota         — Device → Cloud  | QoS 1 | OTA progress/status
 *   gw/{farm_id}/{gw_id}/yieldtest   — Device → Cloud  | QoS 1 | Yield-test progress/data
 *   gw/{farm_id}/{gw_id}/recovery    — Device → Cloud  | QoS 1 | Recovery telemetry
 *   gw/{farm_id}/{gw_id}/cmd         — Cloud → Device  | QoS 1 | Auto-subscribed on connect
 *   gw/{farm_id}/{gw_id}/display     — Cloud → App/Device | QoS 1 | LED+LCD authoritative UI
 *   nodes/{node_id}/env    — Gateway → Cloud | QoS 0 | On LoRa RX
 *   valves/{valve_id}/status — Gateway → Cloud | QoS 1 | On valve change
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * PAYLOAD SCHEMAS (v3.0)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * 1. TELEMETRY (.../telemetry)
 *    Published every 5 seconds (motor running) or 10 seconds (motor idle)
 *    Contains real-time electrical, hydraulic, motor, network, and system data
 *
 *    {
 *      "v": "3.0",                         // Payload version
 *      "ts": "2026-04-16T09:30:00.000Z",  // Device timestamp (ISO 8601)
 *      "el": {                            // Electrical monitoring
 *        "v": [230.5, 231.2, 229.8],      // Phase voltages (R, Y, B) [volts]
 *        "i": [4.1, 4.0, 4.1],            // Phase currents (R, Y, B) [amps]
 *        "f": 50.01,                      // Frequency [Hz]
 *        "pf": 0.882,                     // Power factor
 *        "tp": 2814.6,                    // Total power [watts]
 *        "imb": 0.8,                      // Current imbalance [%]
 *        "seq": "ABC"                     // Phase sequence (ABC or BAC)
 *      },
 *      "hy": {                            // Hydraulic system (if applicable)
 *        "p": 4.52,                       // Pressure [bar]
 *        "st_h": 0.0                      // Temperature [°C]
 *      },
 *      "m": {                             // Motor state
 *        "st": "run_d",                   // Status: idle, run_s (star), run_d (delta), fault
 *        "rt": 86400,                     // Total runtime [seconds]
 *        "srt": 3600,                     // Session runtime [seconds]
 *        "op": "star_delta",              // Operation mode: star_delta, direct_on_line
 *        "dry": 0                         // Dry-run counter [cycles]
 *      },
 *      "net": {                           // Network status
 *        "connected": true                // GSM/data connectivity
 *      },
 *      "sys": {                           // System status
 *        "upt": 172800,                   // Uptime [seconds]
 *        "bv": 7.4,                       // Battery voltage [volts]
 *        "bp": 85,                        // Battery percentage [%]
 *        "net_s": -67                     // Network signal strength [dBm]
 *      }
 *    }
 *
 * 2. STATUS (.../status)
 *    Published on: Boot, motor start/stop, mode change, fault triggered/cleared, yield test start/stop
 *    Contains motor state and LED indicator status
 *
 *    {
 *      "v": "3.0",                         // Payload version
 *      "ts": "2026-04-16T09:30:00.000Z",  // Device timestamp (ISO 8601)
 *      "motor": {                         // Motor state snapshot
 *        "st": "run_d",                   // Status: idle, run_s, run_d, fault
 *        "active": true                   // Motor actively running
 *      },
 *      "mode": "auto",                    // Operation mode: auto, manual, schedule
 *      "active_test": null,               // Active test (null or test identifier)
 *      "trigger": "motor_start",          // What triggered this status: motor_start, motor_stop, mode_change
 *      "leds": {                          // LED indicator states
 *        "phase_1": true,                 // Phase R LED: on/off
 *        "phase_2": true,                 // Phase Y LED: on/off
 *        "phase_3": true,                 // Phase B LED: on/off
 *        "motor_on": true,                // Motor ON LED: on/off
 *        "motor_trip": false,             // Motor TRIP LED: on/off
 *        "smarthika": true,               // Smarthika/Smart mode LED: on/off
 *        "manual": false,                 // Manual mode LED: on/off
 *        "net_1": true,                   // Network indicator 1 (GSM): on/off
 *        "net_2": false,                  // Network indicator 2 (secondary): on/off
 *        "net_3": true                    // Network indicator 3 (tertiary): on/off
 *      },
 *      "fault": null                      // Fault info (null or fault object)
 *    }
 *
 * 3. HEALTH (.../health)
 *    Published on: Boot and hourly during operation
 *    Contains system health status, network info, and firmware details
 *
 *    {
 *      "v": "3.0",                         // Payload version
 *      "ts": "2026-04-16T09:30:00.000Z",  // Device timestamp (ISO 8601)
 *      "boot": {                          // Hardware status at boot
 *        "gsm_hw": true,                  // GSM hardware OK
 *        "lora_hw": true,                 // LoRa hardware OK
 *        "pri_ok": true,                  // Primary sensor OK
 *        "sec_ok": false                  // Secondary sensor OK
 *      },
 *      "net": {                           // Network details
 *        "s": -67,                        // Signal strength [dBm]
 *        "ip": "10.0.0.1",                // Device IP address
 *        "sim": "8991101200003204769"     // SIM card IMSI
 *      },
 *      "sys": {                           // System information
 *        "fw": "1.2.0",                   // Firmware version
 *        "upt": 0                         // Uptime when published [seconds] (initially 0 at boot)
 *      },
 *      "conf": {                          // Configuration (optional, may vary)
 *        "mode": "auto",                  // Current operation mode
 *        "starter": "star_delta",         // Starter type
 *        "motorType": "3hp_submersible"   // Motor type identifier
 *      }
 *    }
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * STORAGE & LIFECYCLE
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * When any of the above payloads (telemetry, status, health) are received on MQTT:
 *   1. The Android app's mqttService parses the JSON payload
 *   2. The payload is automatically persisted to MongoDB via POST /api/farmer/mqtt/payload
 *   3. The payload is stored in the MqttPayload collection linked to the current farmer
 *   4. Data includes: farmerId, gatewayId, topic, messageType, payloadVersion, payloadTs, payload, receivedAt
 *   5. Indexes enable efficient queries: (farmerId, gatewayId, messageType, receivedAt)
 *
 * MongoDB Collection: MqttPayload
 *   - farmerId: indexed (farmer ownership)
 *   - gatewayId: indexed (device identity)
 *   - messageType: indexed (telemetry | status | health | error | response | etc.)
 *   - receivedAt: indexed (timestamp tracking)
 *   - payloadTs: device timestamp for chronological ordering
 *   - payload: full payload object (mixed schema)
 *
 */

export const MQTT_CONFIG = {
  // ── AWS IoT Core ─────────────────────────────────────────────────────────────
  broker: {
    region: 'ap-south-1',
    identityPoolId: 'ap-south-1:69220134-3327-4972-88f6-99dacd3eea46',
    iotEndpoint: 'a2hbea512zkq36-ats.iot.ap-south-1.amazonaws.com',
    // WebSocket URL: wss://${iotEndpoint}/mqtt
  },

  // ── Authentication (Cognito Identity Pool — no username/password) ─────────────
  auth: {
    clientIdPrefix: 'expo-farmer-app',
  },

  // ── Connection ────────────────────────────────────────────────────────────────
  connection: {
    keepalive: 60,
    clean: true,
    connectTimeout: 30000,
    reconnectPeriod: 5000,
    maxReconnectAttempts: 10,
    reconnectDelay: 3000,
  },

  // ── Topic IDs ─────────────────────────────────────────────────────────────────
  // Replace farmId and gatewayId with your deployed identifiers.
  topics: {
    farmId: 'farm-default',
    gatewayId: 'gw-motor-ctrl-373050', // e.g. gw-motor-ctrl-373050

    // Suffix tokens used with generateGatewayTopic()
    gateway: {
      telemetry: 'telemetry',   // gw/{farm_id}/{gw_id}/telemetry
      status:    'status',      // gw/{farm_id}/{gw_id}/status
      health:    'health',      // gw/{farm_id}/{gw_id}/health
      error:     'error',       // gw/{farm_id}/{gw_id}/error
      response:  'response',    // gw/{farm_id}/{gw_id}/response
      ota:       'ota',         // gw/{farm_id}/{gw_id}/ota
      yieldtest: 'yieldtest',   // gw/{farm_id}/{gw_id}/yieldtest
      recovery:  'recovery',    // gw/{farm_id}/{gw_id}/recovery
      display:   'display',     // gw/{farm_id}/{gw_id}/display
      cmd:       'cmd',         // gw/{farm_id}/{gw_id}/cmd  (subscribe)
    },

    // Suffix token used with generateNodeTopic(nodeId)
    node: {
      env: 'env',               // nodes/{node_id}/env
    },

    // Suffix token used with generateValveTopic(valveId)
    valve: {
      status: 'status',         // valves/{valve_id}/status
    },
  },

  // ── QoS per topic type (AWS IoT supports QoS 0 and 1 only) ───────────────────
  qos: {
    telemetry:   1,   // QoS 1 — at least once
    status:      1,   // QoS 1 — on event
    health:      0,   // QoS 0 — best effort
    error:       1,   // QoS 1 — priority fault alert
    response:    1,   // QoS 1 — command ACK/NACK
    ota:         1,   // QoS 1 — OTA state/progress
    yieldtest:   1,   // QoS 1 — yield test stream
    recovery:    1,   // QoS 1 — recovery stream
    display:     1,   // QoS 1 — authoritative LED/LCD UI
    cmd:         1,   // QoS 1 — cloud commands
    nodeEnv:     0,   // QoS 0 — LoRa forwarded data
    valveStatus: 1,   // QoS 1 — on valve change
  },
};

// ── Topic Builders ──────────────────────────────────────────────────────────────

/**
 * Build a gateway topic.
 * @param {string} suffix  — one of MQTT_CONFIG.topics.gateway values
 * @param {string} [farmId] — defaults to MQTT_CONFIG.topics.farmId
 * @param {string} [gwId]  — defaults to MQTT_CONFIG.topics.gatewayId
 * @returns {string}  e.g. "gw/farmid-1/gw-motor-ctrl-373050/telemetry"
 */
export const generateGatewayTopic = (
  suffix,
  farmId = MQTT_CONFIG.topics.farmId,
  gwId = MQTT_CONFIG.topics.gatewayId
) => `gw/${farmId}/${gwId}/${suffix}`;

/**
 * Build an environmental-node topic.
 * @param {string} nodeId  — e.g. "snr-soil-01"
 * @returns {string}  e.g. "nodes/snr-soil-01/env"
 */
export const generateNodeTopic = (nodeId) => `nodes/${nodeId}/env`;

/**
 * Build a valve-status topic.
 * @param {string} valveId — e.g. "valve-zone-03"
 * @returns {string}  e.g. "valves/valve-zone-03/status"
 */
export const generateValveTopic = (valveId) => `valves/${valveId}/status`;

// ── Commands (Cloud → Device, published to gw/{farm_id}/{gw_id}/cmd) ──────────
export const MOTOR_COMMANDS = {
  PUMP_START:   'PUMP_START',   // Start the pump
  PUMP_STOP:    'PUMP_STOP',    // Stop the pump
  VALVE_CTRL:   'VALVE_CTRL',   // Open / close a valve
  MODE_CHANGE:  'MODE_CHANGE',  // Switch auto | manual | schedule
  CMD_FAULT_RESET: 'CMD_FAULT_RESET', // Clear active fault / trip
  OTA_START: 'OTA_START', // Trigger OTA process
  YIELD_TEST_START: 'YIELD_TEST_START', // Start yield test
  YIELD_TEST_STOP: 'YIELD_TEST_STOP', // Stop/abort yield test
};

// ── Motor States (m.st field in telemetry / status payloads) ───────────────────
export const MOTOR_STATES = {
  IDLE:         'idle',         // Motor stopped
  RUNNING_STAR: 'run_s',        // Running — star contactor
  RUNNING_DELTA:'run_d',        // Running — delta contactor (star-delta mode)
  FAULT:        'fault',        // Fault / tripped
  UNKNOWN:      'unknown',      // State not yet received
};

// ── Payload Schema Versions ────────────────────────────────────────────────────
export const PAYLOAD_VERSION = '3.0';

// ── Message-type labels (for internal Redux / state tracking) ─────────────────
export const MESSAGE_TYPES = {
  TELEMETRY:    'telemetry',
  MOTOR_STATUS: 'motor_status',
  HEALTH:       'health',
  ERROR:        'error',
  RESPONSE:     'response',
  OTA:          'ota',
  YIELDTEST:    'yieldtest',
  RECOVERY:     'recovery',
  DISPLAY:      'display',
  CMD:          'cmd',
  NODE_ENV:     'node_env',
  VALVE_STATUS: 'valve_status',
  MOTOR_COMMAND: 'motor_command',
  MQTT_MESSAGE: 'mqtt_message',
};

export default MQTT_CONFIG;
