'use strict';

const express          = require('express');
const reviewController = require('../controllers/reviewController');
const authController   = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// ── All review routes require authentication ──────────────────
router.use(authController.protect);

// ── User-scoped routes ────────────────────────────────────────
router
  .route('/')
  .get(reviewController.getAllReviews)          // own reviews only
  .post(
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)             // ownership enforced in controller
  .patch(reviewController.updateReview)        // ownership enforced in controller
  .delete(reviewController.deleteReview);      // ownership enforced in controller

// ── Admin-only routes ─────────────────────────────────────────
router.use('/admin', authController.restrictTo('Admin'));

router.get('/admin/all',    reviewController.adminGetAllReviews);
router.delete('/admin/:id', reviewController.adminDeleteReview);

module.exports = router;
