const express = require('express');
const { loginSahayak, loginFarmer } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/sahayak/login', loginSahayak);
router.post('/farmer/login', loginFarmer);

module.exports = router;