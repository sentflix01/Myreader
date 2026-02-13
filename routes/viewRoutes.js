const express = require('express');
const viewsControllers = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply isLoggedIn middleware to all view routes to set res.locals.user
router.use(authController.isLoggedIn);

router.get('/', authController.isLoggedIn, viewsControllers.getOverview);
router.get(
  '/chat',
  authController.protect,
  authController.isLoggedIn,
  viewsControllers.getChat,
);
router.get('/hero', viewsControllers.getHero);
router.get(
  '/dashboard',
  authController.protect,
  authController.isLoggedIn,
  viewsControllers.getDashbord,
);
router.get('/pricing', authController.isLoggedIn, viewsControllers.getPricing);
router.get(
  '/services',
  authController.isLoggedIn,
  viewsControllers.getServices,
);
router.get('/feaures', authController.isLoggedIn, viewsControllers.getFeaures);
router.get('/login', authController.isLoggedIn, viewsControllers.getLogin);
router.get('/signup', viewsControllers.getSignup);
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
// router.get('/success', authController.isLoggedIn, viewsControllers.getSuccess);

module.exports = router;
