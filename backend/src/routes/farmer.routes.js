const express = require('express');
const { 
  getFarmerStatus, 
  getFarmerProfile, 
  persistMqttPayload,
  getMqttPayloadHistory,
  getLatestMqttPayload,
} = require('../controllers/farmer.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken, requireRole('farmer'));

router.get('/status', getFarmerStatus);
router.get('/profile', getFarmerProfile);
router.post('/mqtt/payload', persistMqttPayload);
router.get('/mqtt/history', getMqttPayloadHistory);
router.get('/mqtt/latest', getLatestMqttPayload);

module.exports = router;