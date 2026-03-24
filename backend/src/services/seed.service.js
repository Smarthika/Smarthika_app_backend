const bcrypt = require('bcryptjs');
const Sahayak = require('../models/sahayak.model');

const ensureFixedSahayak = async () => {
  const sahayakId = process.env.FIXED_SAHAYAK_ID || 'SH001';
  const password = process.env.FIXED_SAHAYAK_PASSWORD || 'password123';

  const existing = await Sahayak.findOne({ sahayakId });
  if (existing) {
    return existing;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sahayak = await Sahayak.create({
    sahayakId,
    name: process.env.FIXED_SAHAYAK_NAME || 'Default Sahayak',
    mobile: process.env.FIXED_SAHAYAK_MOBILE || '8888888888',
    password: hashedPassword,
    district: process.env.FIXED_SAHAYAK_DISTRICT || 'Haveri',
    registrationDate: new Date(),
    status: 'ACTIVE',
  });

  return sahayak;
};

module.exports = { ensureFixedSahayak };