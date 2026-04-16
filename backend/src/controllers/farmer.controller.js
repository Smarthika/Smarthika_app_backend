const Farmer = require('../models/farmer.model');
const FarmerDevice = require('../models/farmerDevice.model');
const MqttPayload = require('../models/mqttPayload.model');

const normalizeFlowStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (
    normalizedStatus === 'PENDING_SITE_ANALYSIS'
    || normalizedStatus === 'SITE_ANALYSIS_PENDING'
    || normalizedStatus === 'PENDING_ANALYSIS'
  ) {
    return 'PENDING_PASSWORD_SETUP';
  }

  return normalizedStatus || 'PENDING_KYC';
};

const mapStatusToStages = (farmer) => ({
  kyc: farmer.stages_kyc || 'PENDING',
  land: farmer.stages_land || 'PENDING',
  devices: farmer.stages_devices || 'NOT_REQUESTED',
});

const getFarmerStatus = async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ farmerId: req.user.farmerId });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const devices = await FarmerDevice.find({ farmerId: req.user.farmerId }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      overallStatus: farmer.overallStatus || 'PENDING_APPROVAL',
      status: normalizeFlowStatus(farmer.status),
      stages: {
        ...mapStatusToStages(farmer),
        devices: devices.length > 0 ? 'REQUESTED' : (farmer.stages_devices || 'NOT_REQUESTED'),
      },
      sahayakContact: '+91 8888888888',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch farmer status', error: error.message });
  }
};

const getFarmerProfile = async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ farmerId: req.user.farmerId }).select('-password');

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const devices = await FarmerDevice.find({ farmerId: req.user.farmerId }).sort({ createdAt: 1 });

    const aadhaarMasked = farmer.aadhaarNumber
      ? `************${String(farmer.aadhaarNumber).slice(-4)}`
      : '************1234';

    return res.json({
      success: true,
      profile: {
        name: farmer.name,
        mobile: farmer.mobile,
        fatherName: farmer.fatherName || 'Not Provided',
        village: farmer.village || 'Not Provided',
        district: farmer.district || 'Not Provided',
        aadhaarNumber: aadhaarMasked,
      },
      land: [],
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        deviceKey: device.deviceKey,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        status: device.status,
        assignedAt: device.assignedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch farmer profile', error: error.message });
  }
};

const persistMqttPayload = async (req, res) => {
  try {
    const {
      gatewayId,
      topic,
      messageType,
      payload,
      payloadVersion,
      payloadTs,
    } = req.body;

    if (!gatewayId || !topic || !messageType || !payload) {
      return res.status(400).json({
        success: false,
        message: 'gatewayId, topic, messageType and payload are required',
      });
    }

    const allowedMessageTypes = new Set([
      'telemetry', 'status', 'display', 'error', 'response', 'health', 'ota', 'yieldtest', 'recovery',
    ]);

    if (!allowedMessageTypes.has(String(messageType).trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Unsupported messageType' });
    }

    await MqttPayload.create({
      farmerId: req.user.farmerId,
      gatewayId: String(gatewayId).trim(),
      topic: String(topic).trim(),
      messageType: String(messageType).trim().toLowerCase(),
      payloadVersion: payloadVersion ? String(payloadVersion).trim() : '3.0',
      payloadTs: payloadTs ? new Date(payloadTs) : undefined,
      payload,
      receivedAt: new Date(),
    });

    return res.status(201).json({ success: true, message: 'Payload saved' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to persist MQTT payload',
      error: error.message,
    });
  }
};

const getMqttPayloadHistory = async (req, res) => {
  try {
    const { messageType, gatewayId, hours = 24, limit = 100 } = req.query;

    const startTime = new Date(Date.now() - hours * 3600 * 1000);
    const filter = {
      farmerId: req.user.farmerId,
      receivedAt: { $gte: startTime },
    };

    if (messageType) {
      filter.messageType = String(messageType).trim().toLowerCase();
    }

    if (gatewayId) {
      filter.gatewayId = String(gatewayId).trim();
    }

    const payloads = await MqttPayload.find(filter)
      .sort({ receivedAt: -1 })
      .limit(Math.min(parseInt(limit) || 100, 1000))
      .select('-__v');

    return res.json({
      success: true,
      count: payloads.length,
      filter: { messageType, gatewayId, hoursBack: hours },
      payloads,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch MQTT payload history',
      error: error.message,
    });
  }
};

const getLatestMqttPayload = async (req, res) => {
  try {
    const { messageType, gatewayId } = req.query;

    if (!messageType) {
      return res.status(400).json({
        success: false,
        message: 'messageType is required',
      });
    }

    const filter = {
      farmerId: req.user.farmerId,
      messageType: String(messageType).trim().toLowerCase(),
    };

    if (gatewayId) {
      filter.gatewayId = String(gatewayId).trim();
    }

    const payload = await MqttPayload.findOne(filter)
      .sort({ receivedAt: -1 })
      .select('-__v');

    if (!payload) {
      return res.json({
        success: true,
        payload: null,
        message: 'No payload found',
      });
    }

    return res.json({
      success: true,
      payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest MQTT payload',
      error: error.message,
    });
  }
};

module.exports = {
  getFarmerStatus,
  getFarmerProfile,
  persistMqttPayload,
  getMqttPayloadHistory,
  getLatestMqttPayload,
};