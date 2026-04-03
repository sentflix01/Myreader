const express = require('express');
const authController = require('../controllers/authController');
const billingController = require('../controllers/billingController');

const router = express.Router();

router.use(authController.protect);

router.get('/me', billingController.getBillingState);
router.post('/subscribe', billingController.subscribe);
router.post('/create-checkout-session', billingController.createCheckoutSession);
router.post('/cancel-subscription', billingController.cancelSubscription);

module.exports = router;