const express = require('express');
const authController = require('../controllers/authController');
const billingController = require('../controllers/billingController');

const router = express.Router();

router.post(
  '/create-checkout-session',
  authController.protect,
  billingController.createCheckoutSession,
);

module.exports = router;

