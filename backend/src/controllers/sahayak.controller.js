const bcrypt = require('bcryptjs');
const Farmer = require('../models/farmer.model');
const Land = require('../models/land.model');
const SiteAnalysis = require('../models/siteAnalysis.model');

const buildDate = () => new Date().toISOString().split('T')[0];

const generateFarmerId = () => `farmer_${Date.now()}`;
const generateUsername = (mobileNumber) => String(mobileNumber).trim();

const getSahayakFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find({ sahayakId: req.user.sahayakId })
      .sort({ createdAt: -1 })
      .select('farmerId name mobile village status registeredDate');

    return res.json({
      success: true,
      farmers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch farmers', error: error.message });
  }
};

const getFarmerDetails = async (req, res) => {
  try {
    const { farmerId } = req.params;

    const farmer = await Farmer.findOne({
      farmerId,
      sahayakId: req.user.sahayakId,
    }).select('-password');

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    return res.json({ success: true, farmer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch farmer details', error: error.message });
  }
};

const onboardNewFarmer = async (req, res) => {
  try {
    const { name, mobileNumber, village, fatherName, district } = req.body;

    if (!name || !mobileNumber || !village) {
      return res.status(400).json({
        success: false,
        message: 'name, mobileNumber and village are required',
      });
    }

    const normalizedMobile = String(mobileNumber).trim();
    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const existingFarmer = await Farmer.findOne({ mobile: normalizedMobile });
    if (existingFarmer) {
      return res.status(409).json({ success: false, message: 'Farmer already exists with this mobile number' });
    }

    const farmerId = generateFarmerId();
    const username = generateUsername(normalizedMobile);
    await Farmer.create({
      farmerId,
      sahayakId: req.user.sahayakId,
      name: String(name).trim(),
      username,
      mobile: normalizedMobile,
      village: String(village).trim(),
      fatherName: fatherName ? String(fatherName).trim() : undefined,
      district: district ? String(district).trim() : undefined,
      status: 'PENDING_KYC',
      overallStatus: 'PENDING_APPROVAL',
      stages_kyc: 'PENDING',
      stages_land: 'PENDING',
      stages_siteAnalysis: 'PENDING',
      stages_devices: 'NOT_REQUESTED',
      registeredDate: new Date(),
      createdBy: req.user.sahayakId,
    });

    return res.status(201).json({
      success: true,
      farmerId,
      username,
      registeredDate: buildDate(),
      message: 'Farmer onboarded successfully. Set password after site analysis to approve farmer.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to onboard farmer', error: error.message });
  }
};

const completeKYC = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { aadhaarNumber } = req.body;

    const farmer = await Farmer.findOne({ farmerId, sahayakId: req.user.sahayakId });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    farmer.aadhaarNumber = aadhaarNumber;
    farmer.aadhaarVerified = true;
    farmer.aadhaarVerificationDate = new Date();
    farmer.status = 'PENDING_LAND_VERIFICATION';
    farmer.stages_kyc = 'COMPLETED';
    farmer.stages_land = 'PENDING_VERIFICATION';
    await farmer.save();

    return res.json({ success: true, message: 'KYC completed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to complete KYC', error: error.message });
  }
};

const registerLand = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { landData } = req.body;

    if (!landData) {
      return res.status(400).json({
        success: false,
        message: 'landData is required',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, sahayakId: req.user.sahayakId });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const normalizedLandData = {
      surveyNo: String(landData.surveyNo || '').trim(),
      village: String(landData.village || '').trim(),
      tehsil: String(landData.tehsil || '').trim(),
      district: String(landData.district || '').trim(),
      area: String(landData.area || '').trim(),
      landType: landData.landType || 'Agricultural',
      geoJson: landData.geoJson,
    };

    const existingLand = await Land.findOne({ farmerId });
    if (existingLand) {
      existingLand.surveyNo = normalizedLandData.surveyNo;
      existingLand.village = normalizedLandData.village;
      existingLand.tehsil = normalizedLandData.tehsil;
      existingLand.district = normalizedLandData.district;
      existingLand.area = normalizedLandData.area;
      existingLand.landType = normalizedLandData.landType;
      if (normalizedLandData.geoJson) {
        existingLand.geoJson = normalizedLandData.geoJson;
      }
      existingLand.verificationStatus = 'VERIFIED';
      existingLand.verificationDate = new Date();
      existingLand.verifiedBy = req.user.sahayakId;
      existingLand.source = 'MANUAL_ENTRY';
      await existingLand.save();
    } else {
      await Land.create({
        landId: `land_${Date.now()}`,
        farmerId,
        surveyNo: normalizedLandData.surveyNo,
        village: normalizedLandData.village,
        tehsil: normalizedLandData.tehsil,
        district: normalizedLandData.district,
        area: normalizedLandData.area,
        landType: normalizedLandData.landType,
        geoJson: normalizedLandData.geoJson,
        verificationStatus: 'VERIFIED',
        verificationDate: new Date(),
        verifiedBy: req.user.sahayakId,
        source: 'MANUAL_ENTRY',
      });
    }

    // Store land details
    farmer.landData = normalizedLandData;

    farmer.status = 'PENDING_SITE_ANALYSIS';
    farmer.stages_land = 'COMPLETED';
    farmer.stages_siteAnalysis = 'PENDING';
    farmer.landVerifiedDate = new Date();
    await farmer.save();

    return res.json({ success: true, message: 'Land details submitted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to register land', error: error.message });
  }
};

const completeSiteAnalysis = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { analysisData } = req.body;

    if (!analysisData) {
      return res.status(400).json({
        success: false,
        message: 'analysisData is required',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, sahayakId: req.user.sahayakId });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const existingSiteAnalysis = await SiteAnalysis.findOne({ farmerId }).sort({ createdAt: -1 });
    const sitePayload = {
      soilType: String(analysisData.soilType || '').trim(),
      notes: String(analysisData.recommendations || '').trim(),
      visitDate: new Date(),
      conductedBy: req.user.sahayakId,
      status: 'COMPLETED',
    };

    if (existingSiteAnalysis) {
      existingSiteAnalysis.soilType = sitePayload.soilType;
      existingSiteAnalysis.waterSource = String(analysisData.waterSource || '').trim();
      existingSiteAnalysis.powerSupply = String(analysisData.powerAvailability || '').trim();
      existingSiteAnalysis.notes = sitePayload.notes;
      existingSiteAnalysis.visitDate = sitePayload.visitDate;
      existingSiteAnalysis.conductedBy = sitePayload.conductedBy;
      existingSiteAnalysis.status = sitePayload.status;
      await existingSiteAnalysis.save();
    } else {
      await SiteAnalysis.create({
        analysisId: `analysis_${Date.now()}`,
        farmerId,
        soilType: sitePayload.soilType,
        waterSource: String(analysisData.waterSource || '').trim(),
        powerSupply: String(analysisData.powerAvailability || '').trim(),
        notes: sitePayload.notes,
        visitDate: sitePayload.visitDate,
        conductedBy: sitePayload.conductedBy,
        status: sitePayload.status,
      });
    }

    // Store site analysis details
    farmer.siteAnalysisData = {
      soilType: analysisData.soilType,
      waterSource: analysisData.waterSource,
      powerAvailability: analysisData.powerAvailability,
      siteCondition: analysisData.siteCondition,
      recommendations: analysisData.recommendations,
      suitabilityScore: analysisData.suitabilityScore,
    };

    farmer.status = 'PENDING_PASSWORD_SETUP';
    farmer.stages_siteAnalysis = 'COMPLETED';
    farmer.stages_devices = 'NOT_REQUESTED';
    farmer.siteAnalysisCompletedDate = new Date();
    await farmer.save();

    return res.json({
      success: true,
      message: 'Site analysis completed successfully. Set farmer password to approve account.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to complete site analysis', error: error.message });
  }
};

const setFarmerPassword = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { password } = req.body;

    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, sahayakId: req.user.sahayakId });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    if (farmer.status !== 'PENDING_PASSWORD_SETUP') {
      return res.status(400).json({
        success: false,
        message: 'Password can be set only after site analysis is completed',
      });
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    farmer.password = hashedPassword;

    if (!farmer.username) {
      farmer.username = farmer.mobile;
    }

    farmer.status = 'APPROVED';
    farmer.overallStatus = 'APPROVED';
    farmer.approvedDate = new Date();

    await farmer.save();

    return res.json({
      success: true,
      message: 'Farmer password updated successfully',
      username: farmer.username || farmer.mobile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to set farmer password',
      error: error.message,
    });
  }
};

module.exports = {
  getSahayakFarmers,
  getFarmerDetails,
  onboardNewFarmer,
  completeKYC,
  registerLand,
  completeSiteAnalysis,
  setFarmerPassword,
};