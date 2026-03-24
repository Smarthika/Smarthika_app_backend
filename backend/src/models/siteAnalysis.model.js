const mongoose = require('mongoose');

const siteAnalysisSchema = new mongoose.Schema(
  {
    analysisId: { type: String, required: true, unique: true, index: true },
    farmerId: { type: String, required: true, index: true },
    landId: { type: String, index: true },

    soilType: String,

    waterSource: String,

    powerSupply: String,

    pumpType: String,

    pumpCapacity: String,

    visitDate: Date,
    conductedBy: String,

    photos: [String],
    notes: String,

    recommendedDevices: [String],

    estimatedInstallationDate: Date,
    installationCost: Number,

    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'],
      index: true,
    },

    approvedBy: String,
    approvalDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteAnalysis', siteAnalysisSchema);