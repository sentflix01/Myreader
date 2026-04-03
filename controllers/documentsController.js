'use strict';

const Document   = require('../model/documentsModel');
const catchAsync = require('../utils/catchAsync');
const AppError   = require('../utils/appError');

// ── Helpers ───────────────────────────────────────────────────

/** Ensure the requesting user owns the document (or is Admin). */
async function findOwnedDoc(req, next) {
  const doc = await Document.findById(req.params.id);
  if (!doc) return next(new AppError('No document found with that ID', 404));

  const isAdmin = req.user.role === 'Admin';
  const isOwner = doc.user?.toString() === req.user.id;

  if (!isAdmin && !isOwner) {
    return next(new AppError('You do not have permission to access this document', 403));
  }
  return doc;
}

// ── User-scoped handlers ──────────────────────────────────────

/** GET /api/v1/documents — returns only the logged-in user's documents */
exports.getMyDocuments = catchAsync(async (req, res) => {
  const queryObj = { user: req.user.id };

  // Optional filters from query string
  if (req.query.fileType) queryObj.fileType = req.query.fileType;
  if (req.query.status)   queryObj.status   = req.query.status;

  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const skip  = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    Document.find(queryObj)
      .select('-embeddings')
      .sort(req.query.sort || '-createdAt')
      .skip(skip)
      .limit(limit),
    Document.countDocuments(queryObj),
  ]);

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { documents },
  });
});

/** GET /api/v1/documents/:id — user can only read their own doc */
exports.getDocument = catchAsync(async (req, res, next) => {
  const doc = await findOwnedDoc(req, next);
  if (!doc) return;

  res.status(200).json({ status: 'success', data: { document: doc } });
});

/** POST /api/v1/documents — create a doc owned by the logged-in user */
exports.createDocument = catchAsync(async (req, res) => {
  // Force owner to be the logged-in user — never trust req.body.user
  req.body.user  = req.user.id;
  req.body.owner = req.user.id;

  const doc = await Document.create(req.body);

  res.status(201).json({ status: 'success', data: { document: doc } });
});

/** PATCH /api/v1/documents/:id — user can only update their own doc */
exports.updateDocument = catchAsync(async (req, res, next) => {
  const existing = await findOwnedDoc(req, next);
  if (!existing) return;

  // Prevent changing ownership
  delete req.body.user;
  delete req.body.owner;

  const doc = await Document.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { document: doc } });
});

/** DELETE /api/v1/documents/:id — user can only delete their own doc */
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const existing = await findOwnedDoc(req, next);
  if (!existing) return;

  await Document.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: 'success', data: null });
});

// ── Admin-only handlers ───────────────────────────────────────

/** GET /api/v1/documents/admin/all — admin sees ALL documents */
exports.adminGetAllDocuments = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.userId)   filter.user     = req.query.userId;
  if (req.query.fileType) filter.fileType = req.query.fileType;
  if (req.query.status)   filter.status   = req.query.status;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .select('-embeddings')
      .populate('user', 'name email subscriptionTier')
      .sort(req.query.sort || '-createdAt')
      .skip(skip)
      .limit(limit),
    Document.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { documents },
  });
});

/** GET /api/v1/documents/admin/:id — admin reads any document */
exports.adminGetDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id)
    .populate('user', 'name email subscriptionTier');
  if (!doc) return next(new AppError('No document found with that ID', 404));

  res.status(200).json({ status: 'success', data: { document: doc } });
});

/** PATCH /api/v1/documents/admin/:id — admin updates any document */
exports.adminUpdateDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doc) return next(new AppError('No document found with that ID', 404));

  res.status(200).json({ status: 'success', data: { document: doc } });
});

/** DELETE /api/v1/documents/admin/:id — admin deletes any document */
exports.adminDeleteDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findByIdAndDelete(req.params.id);
  if (!doc) return next(new AppError('No document found with that ID', 404));

  res.status(204).json({ status: 'success', data: null });
});
