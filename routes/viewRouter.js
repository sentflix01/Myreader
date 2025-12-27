// const express = require('express');
// const viewsController = require('../controllers/viewController');
// const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

// const Router = express.Router();

// Router.use(viewsController.alerts);

// Router.get('/', authController.isLoggedIn, viewsController.getOverview);
// Router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
// Router.get('/signup', authController.isLoggedIn, viewsController.getSignUpForm);
// Router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
// Router.get('/verifyEmail/:token', authController.verifyEmail);
// Router.get('/me', authController.protect, viewsController.getAccount);
// Router.get(
//   '/my-tours',
//   // bookingController.createBookingCheckout
//   authController.protect,
//   viewsController.getMyTours
// );

// Router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewsController.updateUserData
// );

// module.exports = Router;
