const Document = require('./../models/documentsModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

const getAuthenticatedUserId = (req) => req.user?.id || req.user?._id;

const validateObjectId = (id) => {
  return id && id.match(/^[0-9a-fA-F]{24}$/);
};

// GET ALL documents
exports.getAllDocument = catchAsync(async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  // Create base filter with user ID
  const baseFilter = { user: userId };
  
  // Use APIFeatures for consistent query handling
  const features = new APIFeatures(
    Document.find(baseFilter),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Exclude embeddings by default for performance
  if (!req.query.fields) {
    features.query = features.query.select('-embeddings');
  }

  const documents = await features.query;

  res.status(200).json({
    status: 'success',
    results: documents.length,
    data: {
      documents,
    },
  });
});

// GET Document BY ID
exports.getDocument = catchAsync(async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!validateObjectId(req.params.id)) {
    return next(new AppError('Invalid document ID format', 400));
  }

  const docum = await Document.findOne({ _id: req.params.id, user: userId });
  if (!docum) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      docum,
    },
  });
});
// CREATE Document
exports.createDocument = (req, res) => {
  // const documents = readdocuments();

  // const newDocum = {
  //   _id: crypto.randomUUID(),
  //   ...req.body,
  // };

  // documents.push(newDocum);
  // writedocuments(documents);

  res.status(201).json({
    status: 'success',
    // data: { docum: newDocum },
  });
};

// UPDATE Document
exports.updateDocument = catchAsync(async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!validateObjectId(req.params.id)) {
    return next(new AppError('Invalid document ID format', 400));
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('No data provided for update', 400));
  }

  const docum = await Document.findOneAndUpdate(
    { _id: req.params.id, user: userId },
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!docum) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      docum,
    },
  });
});

// DELETE Document
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  if (!validateObjectId(req.params.id)) {
    return next(new AppError('Invalid document ID format', 400));
  }

  const docum = await Document.findOneAndDelete({
    _id: req.params.id,
    user: userId,
  });

  if (!docum) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// DELETE ALL Documents for current user
exports.deleteAllDocuments = catchAsync(async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const result = await Document.deleteMany({ user: userId });
  
  res.status(200).json({
    status: 'success',
    message: `Deleted ${result.deletedCount} documents`,
    data: {
      deletedCount: result.deletedCount,
    },
  });
});
