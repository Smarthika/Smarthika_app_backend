const express = require('express');
const {
  getSahayakFarmers,
  getFarmerDetails,
  onboardNewFarmer,
  completeKYC,
  registerLand,
  setFarmerPassword,
  getFarmerDevices,
  saveFarmerDevices,
} = require('../controllers/sahayak.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken, requireRole('sahayak'));

router.get('/farmers', getSahayakFarmers);
router.get('/farmer/:farmerId', getFarmerDetails);
router.post('/onboard', onboardNewFarmer);
router.post('/farmer/:farmerId/kyc', completeKYC);
router.post('/farmer/:farmerId/land', registerLand);
router.post('/farmer/:farmerId/set-password', setFarmerPassword);
router.get('/farmer/:farmerId/devices', getFarmerDevices);
router.post('/farmer/:farmerId/devices', saveFarmerDevices);

module.exports = router;