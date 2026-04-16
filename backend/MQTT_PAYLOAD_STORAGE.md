# MQTT Payload Storage Documentation

## Overview

The Farmer App automatically stores MQTT telemetry, status, and health data to MongoDB whenever these messages are received on the MQTT broker. This enables historical tracking, analytics, and audit trails for each farmer's motor control device.

## Architecture

### Data Flow

```
MQTT Broker (AWS IoT Core)
    ↓
Android App (mqttService)
    ↓ (processMessage)
    ├─ Parse JSON payload
    ├─ Notify listeners (home.js, etc.)
    └─ Call persistImportantPayload()
            ↓ (HTTP POST)
Backend API (/api/farmer/mqtt/payload)
    ↓ (persistMqttPayload controller)
    ↓ (verify authentication)
MongoDB (MqttPayload collection)
```

### Storage Endpoint

**Endpoint:** `POST /api/farmer/mqtt/payload`

**Authentication:** Bearer token (Cognito)

**Request Body:**
```json
{
  "gatewayId": "gw-motor-ctrl-373050",
  "topic": "gw/farm-default/gw-motor-ctrl-373050/telemetry",
  "messageType": "telemetry",
  "payloadVersion": "3.0",
  "payloadTs": "2026-04-16T09:30:00.000Z",
  "payload": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payload saved"
}
```

## MongoDB Schema

### Collection: `MqttPayload`

```javascript
{
  _id: ObjectId,
  farmerId: "farmer_uuid_123",              // Extracted from auth token
  gatewayId: "gw-motor-ctrl-373050",       // Device identifier
  topic: "gw/farm-default/gw-motor-ctrl-373050/telemetry",
  messageType: "telemetry",                 // telemetry | status | health | error | response | ota | yieldtest | recovery
  payloadVersion: "3.0",                    // v3.0 by default
  payloadTs: ISODate("2026-04-16T09:30:00.000Z"),  // Device timestamp
  payload: {
    "v": "3.0",
    "ts": "2026-04-16T09:30:00.000Z",
    "el": { ... },
    "m": { ... },
    // ... full payload object
  },
  receivedAt: ISODate("2026-04-16T09:30:05.123Z"),  // When stored in DB
  createdAt: ISODate("2026-04-16T09:30:05.123Z"),
  updatedAt: ISODate("2026-04-16T09:30:05.123Z"),
  __v: 0
}
```

### Indexes

```javascript
// Index 1: Query by farmer + device + type + time
{
  farmerId: 1,
  gatewayId: 1,
  messageType: 1,
  receivedAt: -1
}

// Index 2: Query by topic
{
  topic: 1
}

// Index 3: Query by message type
{
  messageType: 1
}

// Index 4: TTL expiration (optional) — adjustable based on retention policy
{
  receivedAt: 1
}  // { expireAfterSeconds: 7776000 }  // 90 days
```

## Payload Types

### 1. TELEMETRY

**Topic:** `.../telemetry`

**Frequency:** Every 5 seconds (running) / 10 seconds (idle)

**Content:** Real-time electrical, hydraulic, motor, network, and system metrics

**Fields:**
- `el` — Electrical: voltages, currents, frequency, power factor, total power
- `hy` — Hydraulic: pressure, temperature
- `m` — Motor: status, runtimes, operation mode
- `net` — Network: connectivity
- `sys` — System: uptime, battery, signal strength

---

### 2. STATUS

**Topic:** `.../status`

**Triggering Events:**
- Motor start/stop commands
- Mode changes (auto ↔ manual)
- Fault events (triggered/cleared)
- Yield test start/stop
- Device boot

**Content:** Motor state snapshot + LED indicator states + operation mode

**Fields:**
- `motor` — Motor state (st, active)
- `mode` — Operation mode (auto | manual | schedule)
- `trigger` — What caused this status update
- `leds` — 10 LED indicator states (phases, motor, smart, manual, network)
- `fault` — Null or fault object

---

### 3. HEALTH

**Topic:** `.../health`

**Frequency:** Boot + hourly during operation

**Content:** System health status, network info, firmware details, configuration

**Fields:**
- `boot` — Hardware status (GSM OK, LoRa OK, sensors OK)
- `net` — Network details (signal, IP, SIM)
- `sys` — System info (firmware version, uptime)
- `conf` — Configuration (mode, starter type, motor type)

---

## Retrieval & Analytics

### Query Examples

#### Get latest telemetry for a farmer's device
```javascript
db.MqttPayload.findOne(
  {
    farmerId: "farmer_uuid_123",
    gatewayId: "gw-motor-ctrl-373050",
    messageType: "telemetry"
  },
  { sort: { receivedAt: -1 } }
)
```

#### Get all telemetry from last 24 hours
```javascript
db.MqttPayload.find({
  farmerId: "farmer_uuid_123",
  messageType: "telemetry",
  receivedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
}).sort({ receivedAt: -1 })
```

#### Get status changes in last week
```javascript
db.MqttPayload.find({
  farmerId: "farmer_uuid_123",
  messageType: "status",
  payloadTs: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
}).sort({ payloadTs: -1 })
```

#### Analyze motor runtime trends
```javascript
db.MqttPayload.aggregate([
  {
    $match: {
      farmerId: "farmer_uuid_123",
      messageType: "telemetry",
      payloadTs: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$payloadTs" } },
      avgPower: { $avg: "$payload.el.tp" },
      maxCurrent: { $max: "$payload.el.i" },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

---

## Error Handling

### Controller Validation

The backend endpoint validates:
- ✅ Required fields: `gatewayId`, `topic`, `messageType`, `payload`
- ✅ Message type is one of: telemetry, status, health, error, response, ota, yieldtest, recovery
- ✅ Payload is not empty
- ✅ Auth token is valid (verified by middleware)

### Storage Failures

If persistence fails in the Android app:
- Error is logged to console (dev debugging)
- MQTT message is still processed and listeners notified
- Storage is retried on the next payload of same type

**Logs:**
```
Failed to persist mqtt payload: NetworkError
```

---

## Best Practices

1. **Retention Policy:** Implement TTL (Time-To-Live) indexes to auto-delete old data (e.g., 90 days)
2. **Archival:** For long-term storage, export monthly snapshots to data warehouse
3. **Query Optimization:** Always filter by (farmerId, messageType, receivedAt) when possible
4. **Aggregation:** Use MongoDB aggregation pipeline for analytics
5. **Monitoring:** Set up alerts for missing telemetry (offline devices)

---

## API Additions (Future)

### Recommended endpoints to add:

- `GET /api/farmer/mqtt/history?type=telemetry&hours=24` — Get historical payloads
- `GET /api/farmer/mqtt/latest?gatewayId=xyz&type=status` — Get latest payload
- `GET /api/farmer/mqtt/analytics?type=telemetry&days=7` — Get aggregated analytics
- `DELETE /api/farmer/mqtt/payload/:id` — Manual deletion (admin only)

---

## Troubleshooting

### Issue: Payloads not being stored

**Check:**
1. Is the Android app authenticated? (Token validity in storage)
2. Is `API_BASE_URL` correctly set in `.env`?
3. Are MQTT messages actually being received? (Check home.js handleMQTT logs)
4. Is the backend endpoint reachable? (Check network logs)
5. Is the MongoDB connection working? (Check server console)

### Issue: Storage is slow

**Optimize:**
1. Add batch insertion for high-frequency data (telemetry every 5s)
2. Implement write-ahead logging (WAL)
3. Check MongoDB indexes are being used (explain queries)
4. Increase connection pool size

### Issue: Storage cost is high

**Reduce:**
1. Implement compression (store parsed payload as BSON more efficiently)
2. Archive data older than 30 days to cold storage
3. Aggregate telemetry into hourly summaries instead of storing all 5s samples
4. Filter out low-priority message types (e.g., only store error/status, not telemetry)

---

## References

- MQTT Schema: [mqttConfig.js](../android_app/config/mqttConfig.js)
- Storage Controller: [farmer.controller.js](../../../../src/controllers/farmer.controller.js) — `persistMqttPayload()`
- Android Service: [mqttService.js](../android_app/components/services/mqttService.js) — `persistImportantPayload()`
- MongoDB Model: [mqttPayload.model.js](./models/mqttPayload.model.js)
