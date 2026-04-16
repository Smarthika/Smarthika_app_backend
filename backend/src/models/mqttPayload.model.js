const mongoose = require('mongoose');

const mqttPayloadSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true, index: true },
    gatewayId: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    messageType: {
      type: String,
      required: true,
      enum: ['telemetry', 'status', 'display', 'error', 'response', 'health', 'ota', 'yieldtest', 'recovery'],
      index: true,
    },
    payloadVersion: { type: String, default: '3.0' },
    payloadTs: { type: Date },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

mqttPayloadSchema.index({ farmerId: 1, gatewayId: 1, messageType: 1, receivedAt: -1 });

module.exports = mongoose.model('MqttPayload', mqttPayloadSchema);