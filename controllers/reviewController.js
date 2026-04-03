'use strict';

const Review     = require('../model/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError   = require('../utils/appError');

// ── Helper: find a review and verify ownership ────────────────
async function findOwnedReview(req, next) {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('No review found with that ID', 404));

  const isAdmin = req.user.role === 'Admin';
  const isOwner = review.user?._id?.toString() === req.user.id ||
                  review.user?.toString()       === req.user.id;

  if (!isAdmin && !isOwner) {
    return next(new AppError('You can only modify your own reviews', 403));
  }
  return review;
}

// ── Middleware: inject user + chat/doc IDs from params ────────
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// ── GET /api/v1/reviews — user sees only their own reviews ────
exports.getAllReviews = catchAsync(async (req, res) => {
  const filter = { user: req.user.id };

  const reviews = await Review.find(filter)
    .populate('chat',     'title')
    .populate('document', 'originalFileName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews },
  });
});

// ── GET /api/v1/reviews/:id — user can only read their own ────
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await findOwnedReview(req, next);
  if (!review) return;

  res.status(200).json({ status: 'success', data: { review } });
});

// ── POST /api/v1/reviews — create a review owned by current user
exports.createReview = catchAsync(async (req, res, next) => {
  // Force user to be the logged-in user
  req.body.user = req.user.id;

  const review = await Review.create(req.body);

  res.status(201).json({ status: 'success', data: { review } });
});

// ── PATCH /api/v1/reviews/:id — user can only update their own
exports.updateReview = catchAsync(async (req, res, next) => {
  const existing = await findOwnedReview(req, next);
  if (!existing) return;

  // Prevent changing ownership
  delete req.body.user;

  const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { review } });
});

// ── DELETE /api/v1/reviews/:id — user can only delete their own
exports.deleteReview = catchAsync(async (req, res, next) => {
  const existing = await findOwnedReview(req, next);
  if (!existing) return;

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: 'success', data: null });
});

// ── Admin-only handlers ───────────────────────────────────────

/** GET all reviews across all users (admin only) */
exports.adminGetAllReviews = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.userId) filter.user = req.query.userId;

  const reviews = await Review.find(filter)
    .populate('user',     'name email')
    .populate('chat',     'title')
    .populate('document', 'originalFileName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews },
  });
});

/** DELETE any review (admin only) */
exports.adminDeleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return next(new AppError('No review found with that ID', 404));

  res.status(204).json({ status: 'success', data: null });
});
