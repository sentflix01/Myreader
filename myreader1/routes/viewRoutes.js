const express = require('express');
const viewsControllers = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const billingController = require('../controllers/billingController');

const router = express.Router();

// Set res.locals.user when logged in
router.use(authController.isLoggedIn);

router.get('/', viewsControllers.getOverview);
router.get('/chat', authController.protectPage, viewsControllers.getChat);
router.get('/hero', viewsControllers.getHero);
router.get(
  '/dashboard',
  authController.protectPage,
  viewsControllers.getDashboard,
);
router.get(
  '/billing/success',
  authController.protectPage,
  billingController.renderCheckoutSuccess,
);
router.get('/pricing', viewsControllers.getPricing);
router.get('/services', viewsControllers.getServices);
router.get('/features', viewsControllers.getFeatures);
router.get('/login', viewsControllers.getLogin);
router.get('/signup', viewsControllers.getSignup);
router.get('/editProfile', viewsControllers.getEditProfile);
router.post(
  '/submit-user-data',
  authController.protect,
  viewsControllers.updateUserData,
);
// router.get('/success', authController.isLoggedIn, viewsControllers.getSuccess);

module.exports = router;
