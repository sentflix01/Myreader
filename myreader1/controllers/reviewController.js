const Review = require('./../models/reviewModel');
const Chat = require('./../models/chatsModel');
const Document = require('./../models/documentsModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

const getAuthenticatedUserId = (req) => req.user?.id || req.user?._id;

const isAdmin = (req) => req.user?.role === 'Admin';

const getReviewFilter = (req, includeId = false) => {
  const filter = {};
  if (includeId) filter._id = req.params.id;
  if (!isAdmin(req)) {
    filter.user = getAuthenticatedUserId(req);
  }
  return filter;
};

const ensureOwnedTargets = async (req) => {
  if (isAdmin(req)) return;

  const userId = getAuthenticatedUserId(req);
  const chatId = req.body?.chat;
  const documentId = req.body?.document;

  const [chat, document] = await Promise.all([
    chatId ? Chat.findOne({ _id: chatId, user: userId }).select('_id') : null,
    documentId
      ? Document.findOne({ _id: documentId, user: userId }).select('_id')
      : null,
  ]);

  if (chatId && !chat) {
    throw new AppError(
      'You can only review chats that belong to your own account.',
      403,
    );
  }

  if (documentId && !document) {
    throw new AppError(
      'You can only review documents that belong to your own account.',
      403,
    );
  }
};

exports.getAllReviews = catchAsync(async (req, res) => {
  let filter = getReviewFilter(req);
  if (req.params.tourId) filter = { ...filter, tour: req.params.tourId };

  const features = new APIFeatures(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await features.query;

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      data: reviews,
    },
  });
});

exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOne(getReviewFilter(req, true));

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: review,
    },
  });
});

exports.createReview = catchAsync(async (req, res) => {
  req.body.user = getAuthenticatedUserId(req);
  await ensureOwnedTargets(req);

  const review = await Review.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: review,
    },
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  if (!isAdmin(req)) {
    req.body.user = getAuthenticatedUserId(req);
  }

  await ensureOwnedTargets(req);

  const review = await Review.findOneAndUpdate(getReviewFilter(req, true), req.body, {
    new: true,
    runValidators: true,
  });

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: review,
    },
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findOneAndDelete(getReviewFilter(req, true));

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
