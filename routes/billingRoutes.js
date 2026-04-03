const express = require('express');
const authController = require('../controllers/authController');
const billingController = require('../controllers/billingController');

const router = express.Router();

router.post(
  '/create-checkout-session',
  authController.protect,
  billingController.createCheckoutSession,
);

router.post(
  '/create-portal-session',
  authController.protect,
  billingController.createBillingPortalSession,
);

router.post(
  '/cancel-subscription',
  authController.protect,
  billingController.cancelSubscription,
);

router.get(
  '/my-subscription',
  authController.protect,
  billingController.getMySubscription,
);

module.exports = router;

