require('dotenv').config();

const app = require('../src/app');
const connectDB = require('../src/config/db');
const { ensureFixedSahayak } = require('../src/services/seed.service');

let initializationPromise;

const initialize = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();
      await ensureFixedSahayak();
    })();
  }

  return initializationPromise;
};

module.exports = async (req, res) => {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error('Vercel function initialization failed:', error);
    return res.status(500).json({ success: false, message: 'Server initialization failed' });
  }
};
