const Farmer = require('../models/farmer.model');

const mapStatusToStages = (farmer) => ({
  kyc: farmer.stages_kyc || 'PENDING',
  land: farmer.stages_land || 'PENDING',
  siteAnalysis: farmer.stages_siteAnalysis || 'PENDING',
  devices: farmer.stages_devices || 'NOT_REQUESTED',
});

const getFarmerStatus = async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ farmerId: req.user.farmerId });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    return res.json({
      success: true,
      overallStatus: farmer.overallStatus || 'PENDING_APPROVAL',
      stages: mapStatusToStages(farmer),
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
      devices: farmer.status === 'APPROVED'
        ? [{ deviceId: 'device_001', deviceType: 'Pump Motor Controller', status: 'INSTALLED' }]
        : [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch farmer profile', error: error.message });
  }
};

module.exports = {
  getFarmerStatus,
  getFarmerProfile,
};