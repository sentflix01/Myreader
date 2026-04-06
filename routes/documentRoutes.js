'use strict';

const express = require('express');
const documentsController = require('../controllers/documentsController');
const authController     = require('../controllers/authController');

const router = express.Router();

// ── All document routes require authentication ────────────────
router.use(authController.protect);

// ── Regular user: only their own documents ────────────────────
// GET /api/v1/documents        → user sees only their own docs
// POST /api/v1/documents       → user creates a doc (owner = req.user)
router
  .route('/')
  .get(documentsController.getMyDocuments)
  .post(documentsController.createDocument);

// GET/PATCH/DELETE /api/v1/documents/:id  → ownership enforced in controller
router
  .route('/:id')
  .get(documentsController.getDocument)
  .patch(documentsController.updateDocument)
  .delete(documentsController.deleteDocument);

// ── Admin-only: full CRUD over ALL documents ──────────────────
router.use('/admin', authController.restrictTo('Admin'));

router
  .route('/admin/all')
  .get(documentsController.adminGetAllDocuments);

router
  .route('/admin/:id')
  .get(documentsController.adminGetDocument)
  .patch(documentsController.adminUpdateDocument)
  .delete(documentsController.adminDeleteDocument);

module.exports = router;
