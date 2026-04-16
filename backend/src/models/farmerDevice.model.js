const mongoose = require('mongoose');

const farmerDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    farmerId: { type: String, required: true, index: true },
    sahayakId: { type: String, required: true, index: true },
    deviceKey: {
      type: String,
      required: true,
      enum: ['motor_control', 'device_2', 'device_3'],
      index: true,
    },
    deviceName: { type: String, required: true },
    deviceType: { type: String, required: true },
    status: {
      type: String,
      enum: ['ASSIGNED', 'ACTIVE', 'INACTIVE', 'RETIRED'],
      default: 'ASSIGNED',
      index: true,
    },
    assignedAt: { type: Date, default: Date.now },
    activatedAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

farmerDeviceSchema.index({ farmerId: 1, deviceKey: 1 }, { unique: true });

module.exports = mongoose.model('FarmerDevice', farmerDeviceSchema);