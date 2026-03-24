const mongoose = require('mongoose');

const landSchema = new mongoose.Schema(
  {
    landId: { type: String, required: true, unique: true, index: true },
    farmerId: { type: String, required: true, index: true },

    surveyNo: { type: String, required: true },
    village: { type: String, required: true },
    tehsil: String,
    district: String,
    state: String,

    ownerName: String,
    area: String,
    areaInAcres: Number,
    landType: {
      type: String,
      enum: ['Agricultural', 'Non-Agricultural'],
    },

    // GeoJSON
    geoJson: {
      type: {
        type: String,
        enum: ['Polygon', 'MultiPolygon'],
      },
      coordinates: [[[Number]]],
    },

    boundaryMarkedBy: String,
    boundaryMarkedDate: Date,

    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      index: true,
    },

    verifiedBy: String,
    verificationDate: Date,
    verificationNotes: String,

    source: {
      type: String,
      enum: ['BUCKET_CLAIM', 'MANUAL_ENTRY', 'SEARCH_ADDED'],
    },

    bucketId: String,
  },
  { timestamps: true }
);

landSchema.index({ surveyNo: 1, village: 1 });

module.exports = mongoose.model('Land', landSchema);