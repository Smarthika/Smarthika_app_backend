const express = require('express');
const {
  getSahayakFarmers,
  getFarmerDetails,
  onboardNewFarmer,
  completeKYC,
  registerLand,
  setFarmerPassword,
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

module.exports = router;