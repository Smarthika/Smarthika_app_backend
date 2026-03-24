const mongoose = require('mongoose');

const sahayakSchema = new mongoose.Schema(
  {
    sahayakId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    district: String,
    registrationDate: Date,

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sahayak', sahayakSchema);