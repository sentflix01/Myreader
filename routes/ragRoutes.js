/**
 * ============================================================
 * FILE: routes/ragRoutes.js
 * ============================================================
 * PURPOSE:
 *   Defines all HTTP routes for the RAG (Retrieval-Augmented
 *   Generation) module. Two main route groups:
 *     1. /ingest  — upload one or more files into a named group
 *     2. /chat    — ask a question against a group or specific docs
 *
 * HOW TO INTEGRATE:
 *   In app.js, add:
 *     const ragRouter = require('./routes/ragRoutes');
 *     app.use('/api/v1/rag', ragRouter);
 *
 * MVC ROLE: Router layer — maps HTTP verbs + paths to controller
 *   functions. No business logic here.
 *
 * DOCUMENT GROUP FEATURE:
 *   Every ingest request creates or appends to a "group" identified
 *   by groupId (user-supplied name or auto-generated UUID). The
 *   group acts as a logical knowledge base. Chat requests target
 *   either a whole group or specific docIds within it.
 *
 * TIER ENFORCEMENT:
 *   The tierGuard middleware (defined inline below) reads
 *   req.user.subscriptionTier and blocks operations that exceed
 *   the tier's limits before the request reaches the controller.
 *
 * AMHARIC NOTE:
 *   No special routing changes needed for Amharic. The text
 *   pipeline handles UTF-8 Ge'ez script transparently.
 *
 * SCALING NOTE:
 *   For high-volume ingestion, replace the synchronous ingest
 *   endpoint with a job-queue approach (e.g. Bull/BullMQ) and
 *   return a jobId immediately. Poll /ingest/status/:jobId.
 * ============================================================
 */

'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');

const { protect }    = require('../controllers/authController');
const ragController  = require('../controllers/ragController');
const AppError       = require('../utils/appError');

const router = express.Router();

// ── Tier limits ──────────────────────────────────────────────
const TIER_LIMITS = {
  free:       { maxFiles: 1,  maxFileSizeMB: 5,  maxGroups: 1  },
  premium:    { maxFiles: 10, maxFileSizeMB: 20, maxGroups: 20 },
  enterprise: { maxFiles: 50, maxFileSizeMB: 50, maxGroups: 999 },
};

// ── Multer storage: keep original extension, randomise name ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'rag'));
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

// ── Allowed MIME types — also accept octet-stream (some browsers send this for PDFs) ──
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/octet-stream',   // fallback for PDFs on some browsers
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/html',
]);

// Also allow by extension when MIME is ambiguous
const ALLOWED_EXTS = new Set(['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.html', '.htm']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext)) return cb(null, true);
  cb(new AppError(`File type "${file.mimetype}" (${ext}) is not supported.`, 400), false);
};

// ── Build multer instance based on tier ──────────────────────
const buildUpload = (req, res, next) => {
  const tier   = req.user?.subscriptionTier || 'free';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: limits.maxFileSizeMB * 1024 * 1024 },
  }).array('files', limits.maxFiles);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(`Upload error: ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};

// ── Tier guard for chat (premium+ for multi-doc) ─────────────
const tierGuard = (req, res, next) => {
  const tier    = req.user?.subscriptionTier || 'free';
  const docIds  = req.body?.docIds;

  // Free users can only query a single document at a time
  if (tier === 'free' && Array.isArray(docIds) && docIds.length > 1) {
    return next(
      new AppError('Free tier supports single-document queries only. Upgrade to Premium.', 403),
    );
  }
  next();
};

// ── All routes require authentication ────────────────────────
router.use(protect);

// POST /api/v1/rag/ingest  (and /upload alias used by frontend)
router.post('/ingest', buildUpload, ragController.ingest);
router.post('/upload', buildUpload, ragController.ingest);
router.post('/upload-folder', buildUpload, ragController.ingest);

// POST /api/v1/rag/chat
router.post('/chat', tierGuard, ragController.chat);

// GET /api/v1/rag/groups
router.get('/groups', ragController.getGroups);

// GET /api/v1/rag/groups/:groupId/docs
router.get('/groups/:groupId/docs', ragController.getGroupDocs);

// DELETE /api/v1/rag/docs/:docId
router.delete('/docs/:docId', ragController.deleteDoc);

// ── Admin-only: full visibility over ALL users' RAG data ──────
const { restrictTo } = require('../controllers/authController');
router.use('/admin', restrictTo('Admin'));

// GET /api/v1/rag/admin/all-docs   — all RAG documents across all users
router.get('/admin/all-docs',  ragController.adminGetAllDocs);

// GET /api/v1/rag/admin/user/:userId/groups
router.get('/admin/user/:userId/groups', ragController.adminGetUserGroups);

// DELETE /api/v1/rag/admin/docs/:docId
router.delete('/admin/docs/:docId', ragController.adminDeleteDoc);

// DELETE /api/v1/rag/admin/user/:userId/all
router.delete('/admin/user/:userId/all', ragController.adminDeleteUserDocs);

module.exports = router;
