/**
 * MQTT Configuration for Farmer App
 *
 * Topic schema: GRC_SMARTHIKA_SPI_VI_V3 — Payload Reference v2.1
 * Broker: AWS IoT Core (ap-south-1) | Protocol: MQTT 3.1.1 over TLS
 *
 * Topic namespaces
 *   gw/{gw_id}/telemetry   — Device → Cloud  | QoS 1 | Every 5 s (run) / 10 s (idle)
 *   gw/{gw_id}/status      — Device → Cloud  | QoS 1 | On motor state-change
 *   gw/{gw_id}/health      — Device → Cloud  | QoS 0 | Boot + hourly
 *   gw/{gw_id}/error       — Device → Cloud  | QoS 1 | On fault only
 *   gw/{gw_id}/response    — Device → Cloud  | QoS 1 | ACK/NACK per command
 *   gw/{gw_id}/cmd         — Cloud → Device  | QoS 1 | Auto-subscribed on connect
 *   nodes/{node_id}/env    — Gateway → Cloud | QoS 0 | On LoRa RX
 *   valves/{valve_id}/status — Gateway → Cloud | QoS 1 | On valve change
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
  // Replace gatewayId with the physical device client-id (printed on hardware).
  topics: {
    gatewayId: 'gw-motor-ctrl-373050', // e.g. gw-motor-ctrl-373050

    // Suffix tokens used with generateGatewayTopic()
    gateway: {
      telemetry: 'telemetry',   // gw/{gw_id}/telemetry
      status:    'status',      // gw/{gw_id}/status
      health:    'health',      // gw/{gw_id}/health
      error:     'error',       // gw/{gw_id}/error
      response:  'response',    // gw/{gw_id}/response
      cmd:       'cmd',         // gw/{gw_id}/cmd  (subscribe)
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
    cmd:         1,   // QoS 1 — cloud commands
    nodeEnv:     0,   // QoS 0 — LoRa forwarded data
    valveStatus: 1,   // QoS 1 — on valve change
  },
};

// ── Topic Builders ──────────────────────────────────────────────────────────────

/**
 * Build a gateway topic.
 * @param {string} suffix  — one of MQTT_CONFIG.topics.gateway values
 * @param {string} [gwId]  — defaults to MQTT_CONFIG.topics.gatewayId
 * @returns {string}  e.g. "gw/gw-motor-ctrl-373050/telemetry"
 */
export const generateGatewayTopic = (
  suffix,
  gwId = MQTT_CONFIG.topics.gatewayId
) => `gw/${gwId}/${suffix}`;

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

// ── Commands (Cloud → Device, published to gw/{gw_id}/cmd) ─────────────────────
export const MOTOR_COMMANDS = {
  PUMP_START:   'PUMP_START',   // Start the pump
  PUMP_STOP:    'PUMP_STOP',    // Stop the pump
  VALVE_CTRL:   'VALVE_CTRL',   // Open / close a valve
  MODE_CHANGE:  'MODE_CHANGE',  // Switch auto | manual | schedule
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
export const PAYLOAD_VERSION = '2.1';

// ── Message-type labels (for internal Redux / state tracking) ─────────────────
export const MESSAGE_TYPES = {
  TELEMETRY:    'telemetry',
  MOTOR_STATUS: 'motor_status',
  HEALTH:       'health',
  ERROR:        'error',
  RESPONSE:     'response',
  CMD:          'cmd',
  NODE_ENV:     'node_env',
  VALVE_STATUS: 'valve_status',
};

export default MQTT_CONFIG;
