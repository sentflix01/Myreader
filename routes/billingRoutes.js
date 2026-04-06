const express = require('express');
const authController = require('../controllers/authController');
const billingController = require('../controllers/billingController');

const router = express.Router();

// Create Stripe checkout session
router.post(
  '/create-checkout-session',
  authController.protect,
  billingController.createCheckoutSession,
);

// Alias used by frontend billing.model.js
router.post(
  '/subscribe',
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

// Both /my-subscription and /me return the same data
router.get(
  '/my-subscription',
  authController.protect,
  billingController.getMySubscription,
);

router.get(
  '/me',
  authController.protect,
  billingController.getMySubscription,
);

module.exports = router;

