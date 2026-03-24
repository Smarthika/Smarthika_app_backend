const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/farmer.model');
const Sahayak = require('../models/sahayak.model');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const loginSahayak = async (req, res) => {
  try {
    const { sahayakId, password } = req.body;

    if (!sahayakId || !password) {
      return res.status(400).json({ success: false, message: 'sahayakId and password are required' });
    }

    const sahayak = await Sahayak.findOne({ sahayakId: String(sahayakId).trim().toUpperCase() });
    if (!sahayak) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(String(password), sahayak.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({
      role: 'sahayak',
      sahayakId: sahayak.sahayakId,
      mobile: sahayak.mobile,
      name: sahayak.name,
    });

    return res.json({
      success: true,
      token,
      sahayakData: {
        sahayakId: sahayak.sahayakId,
        name: sahayak.name,
        mobile: sahayak.mobile,
        district: sahayak.district,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sahayak login failed', error: error.message });
  }
};

const loginFarmer = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }

    const normalizedUsername = String(username).trim();

    const farmer = await Farmer.findOne({
      $or: [{ username: normalizedUsername }, { mobile: normalizedUsername }],
    });

    if (!farmer) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (!farmer.password) {
      return res.status(403).json({
        success: false,
        message: 'Farmer account is not approved yet. Contact your Sahayak to complete password setup.',
      });
    }

    const isValidPassword = await bcrypt.compare(String(password), farmer.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    farmer.lastLogin = new Date();
    await farmer.save();

    const token = signToken({
      role: 'farmer',
      farmerId: farmer.farmerId,
      username: farmer.username || farmer.mobile,
      mobile: farmer.mobile,
      name: farmer.name,
    });

    return res.json({
      success: true,
      token,
      farmerData: {
        farmerId: farmer.farmerId,
        username: farmer.username || farmer.mobile,
        name: farmer.name,
        mobile: farmer.mobile,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Farmer login failed', error: error.message });
  }
};

module.exports = {
  loginSahayak,
  loginFarmer,
};