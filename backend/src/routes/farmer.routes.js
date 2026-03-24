const express = require('express');
const { getFarmerStatus, getFarmerProfile } = require('../controllers/farmer.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken, requireRole('farmer'));

router.get('/status', getFarmerStatus);
router.get('/profile', getFarmerProfile);

module.exports = router;