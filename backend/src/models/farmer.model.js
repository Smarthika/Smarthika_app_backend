const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true, unique: true, index: true },
    sahayakId: {
      type: String,
      required: true,
      index: true,
    },

    // Personal
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, index: true },
    password: { type: String },
    fatherName: String,
    mobile: { type: String, required: true, unique: true, index: true },
    village: String,
    district: String,

    // KYC
    aadhaarNumber: String,
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerificationDate: Date,

    // Land Details
    landData: {
      surveyNo: String,
      village: String,
      tehsil: String,
      district: String,
      area: String,
      landType: String,
      geoJson: mongoose.Schema.Types.Mixed,
    },

    // Site Analysis Data
    siteAnalysisData: {
      soilType: String,
      waterSource: String,
      powerAvailability: String,
      siteCondition: String,
      recommendations: String,
      suitabilityScore: Number,
    },

    // Status
    status: {
      type: String,
      enum: [
        'PENDING_KYC',
        'PENDING_LAND_VERIFICATION',
        'PENDING_SITE_ANALYSIS',
        'PENDING_PASSWORD_SETUP',
        'APPROVED',
        'REJECTED',
      ],
      index: true,
      default: 'PENDING_KYC',
    },

    overallStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'PENDING_APPROVAL',
    },

    // Stages
    stages_kyc: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'REJECTED'],
      default: 'PENDING',
    },

    stages_land: {
      type: String,
      enum: [
        'PENDING',
        'PENDING_VERIFICATION',
        'COMPLETED',
        'REJECTED',
      ],
      default: 'PENDING',
    },

    stages_siteAnalysis: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'],
      default: 'PENDING',
    },

    stages_devices: {
      type: String,
      enum: ['NOT_REQUESTED', 'REQUESTED', 'INSTALLED', 'REJECTED'],
      default: 'NOT_REQUESTED',
    },

    // Dates
    registeredDate: Date,
    kycCompletedDate: Date,
    landVerifiedDate: Date,
    siteAnalysisCompletedDate: Date,
    approvedDate: Date,

    // Auth
    authToken: String,
    lastLogin: Date,

    // Metadata
    createdBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farmer', farmerSchema);