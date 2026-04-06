const express = require('express');
const viewsControllers = require('../controllers/viewsController');
const authController = require('../controllers/authController');

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
router.get('/pricing', authController.isLoggedIn, viewsControllers.getPricing);
router.get(
  '/services',
  authController.isLoggedIn,
  viewsControllers.getServices,
);
router.get(
  '/features',
  authController.isLoggedIn,
  viewsControllers.getFeatures,
);
router.get('/login', authController.isLoggedIn, viewsControllers.getLogin);
router.get('/signup', viewsControllers.getSignup);
router.get(
  '/reset-password/:token',
  authController.isLoggedIn,
  viewsControllers.getResetPassword,
);
router.get(
  '/editProfile',
  authController.isLoggedIn,
  viewsControllers.getEditProfile,
);
router.post(
  '/submit-user-data',
  authController.protect,
  viewsControllers.updateUserData,
);

// RAG knowledge base views — integrated into /chat, no separate pages needed
// router.get('/success', authController.isLoggedIn, viewsControllers.getSuccess);

module.exports = router;
