/**
 * ============================================================
 * FILE: controllers/ragController.js
 * ============================================================
 * PURPOSE:
 *   Orchestrates the full RAG workflow. Two primary actions:
 *     1. ingest()  — extract text → chunk → embed → store vectors
 *     2. chat()    — retrieve relevant chunks → generate answer
 *
 * HOW TO INTEGRATE:
 *   Already wired via routes/ragRoutes.js. No changes to app.js
 *   needed beyond adding the ragRouter (see ragRoutes.js header).
 *
 * MVC ROLE: Controller — thin orchestration layer. All heavy
 *   lifting is delegated to the service layer.
 *
 * DOCUMENT GROUP FEATURE:
 *   - ingest(): accepts groupId from req.body (or auto-generates
 *     one). Each uploaded file becomes a RagDocument record with
 *     that groupId. All chunks are stored in Pinecone/memory with
 *     metadata { groupId, docId, userId }.
 *   - chat(): filters vector search by groupId (and optionally
 *     docIds) so the LLM only sees relevant context.
 *
 * SENTBOT ROLE (meta/analytics ONLY):
 *   After generating the final answer, this controller optionally
 *   POSTs a small analytics payload to the internal Sentbot
 *   endpoint. Sentbot NEVER sees the answer text or the retrieved
 *   chunks — only numbers: tokenCount, timeTakenMs, docCount,
 *   chunkCount. This is fire-and-forget (errors are swallowed).
 *
 * AMHARIC NOTE:
 *   The question and answer are passed through as UTF-8 strings.
 *   No special handling needed here; see splitterService.js and
 *   ragService.js for Ge'ez-aware preprocessing.
 *
 * SCALING NOTE:
 *   For async ingestion at scale, replace the await ingestPipeline()
 *   call with a job-queue push and return { jobId } immediately.
 * ============================================================
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const RagDocument   = require('../model/ragModel');
const loaderService = require('../services/loaderService');
const splitter      = require('../services/splitterService');
const embeddings    = require('../services/embeddingsService');
const vectorStore   = require('../services/vectorService');
const {
  buildQuestionSuggestions,
  extractToc,
} = require('../services/documentInsightsService');
const ragService    = require('../services/ragService');
const {
  getPlan,
  ensureCanUpload,
  ensureCanQuery,
  ensureCanStartChatSession,
  ensureCanSendMessage,
  recordUpload,
  recordQuery,
  recordChatSession,
  recordMessage,
} = require('../services/subscriptionService');
const catchAsync    = require('../utils/catchAsync');
const AppError      = require('../utils/appError');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'rag');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const GROUP_LIMITS = {
  free: 1,
  premium: 20,
  enterprise: 999,
};

// ── Helper: fire-and-forget analytics to Sentbot ─────────────
async function notifySentbot(meta) {
  try {
    // Internal call — no auth needed (same process, same server)
    // In a microservice setup, use an internal API key here.
    const payload = JSON.stringify(meta);
    // Using native fetch (Node 18+) or the existing fetch polyfill
    await fetch(`http://localhost:${process.env.PORT || 8000}/api/v1/sentbot/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (_) {
    // Analytics failure must never break the main response
  }
}

// ── POST /api/v1/rag/ingest ───────────────────────────────────
exports.ingest = catchAsync(async (req, res, next) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return next(new AppError('No files uploaded.', 400));
  }

  const userId    = String(req.user.id);
  const tier      = req.user.subscriptionTier || 'free';
  const groupId   = (req.body.groupId || crypto.randomUUID()).trim();
  const groupName = (req.body.groupName || groupId).trim();
  const plan      = getPlan(req.user);
  const isNewGroup = !(await RagDocument.exists({ groupId, userId }));
  const existingDocCount = await RagDocument.countDocuments({ userId });
  const groupLimit = GROUP_LIMITS[tier] || GROUP_LIMITS.free;

  if (
    isNewGroup &&
    groupLimit !== Infinity &&
    (await RagDocument.distinct('groupId', { userId })).length >= groupLimit
  ) {
    return next(new AppError(`Group limit reached for ${plan.label} plan.`, 429));
  }

  if (isNewGroup) {
    await ensureCanStartChatSession(req.user);
  }

  console.log(`[RAG] Ingesting ${files.length} file(s) into group "${groupId}" for user ${userId}`);

  const results = [];
  let successfulUploads = 0;

  for (const file of files) {
    const docId    = crypto.randomUUID();
    const ext      = path.extname(file.originalname).toLowerCase().replace('.', '');
    const filePath = file.path;

    try {
      await ensureCanUpload(req.user, {
        fileSizeBytes: Number(file.size || 0),
        existingDocumentsCount: existingDocCount + successfulUploads,
      });

      // 1. Extract raw text from the file
      console.log(`[RAG] Extracting text from: ${file.originalname}`);
      const rawText = await loaderService.extract(filePath, file.mimetype, ext);

      if (!rawText || rawText.trim().length < 10) {
        throw new AppError(`Could not extract meaningful text from "${file.originalname}".`, 422);
      }

      // 2. Split into chunks
      console.log(`[RAG] Splitting text (${rawText.length} chars)`);
      const chunks = splitter.split(rawText, {
        chunkSize: 800,
        overlap: 200,
        docId,
        groupId,
        userId,
        filename: file.originalname,
        sourceType: ext,
      });
      console.log(`[RAG] Created ${chunks.length} chunks`);

      // 3. Generate embeddings for all chunks
      console.log(`[RAG] Generating embeddings for ${chunks.length} chunks`);
      const embeddedChunks = await embeddings.embedChunks(chunks);

      // 4. Store vectors in Pinecone (or memory fallback)
      console.log(`[RAG] Storing vectors`);
      await vectorStore.upsert(embeddedChunks);

      // 5. Extract document insights for the sidebar before persisting
      const toc = extractToc(rawText, file.originalname);
      const questionSuggestions = buildQuestionSuggestions({
        text: rawText,
        filename: file.originalname,
        toc,
      });

      // 6. Persist document metadata to MongoDB
      await RagDocument.create({
        docId,
        groupId,
        groupName,
        userId,
        originalFilename: file.originalname,
        storagePath: filePath,
        sourceType: ext,
        tier,
        chunkCount: chunks.length,
        textLength: rawText.length,
        status: 'ready',
        toc,
        questionSuggestions,
      });

      results.push({
        docId,
        filename: file.originalname,
        status: 'ready',
        chunkCount: chunks.length,
        toc,
        questionSuggestions,
      });
      successfulUploads += 1;
      await recordUpload(req.user);
      console.log(`[RAG] ✓ Ingested: ${file.originalname} (${chunks.length} chunks)`);

    } catch (err) {
      console.error(`[RAG] ✗ Failed to ingest "${file.originalname}":`, err.message);
      console.error(`[RAG] Stack:`, err.stack?.split('\n').slice(0,4).join('\n'));
      // Clean up temp file on error
      fs.unlink(filePath, () => {});
      results.push({ docId, filename: file.originalname, status: 'failed', error: err.message });
    }
  }

  if (isNewGroup && successfulUploads > 0) {
    await recordChatSession(req.user);
  }

  res.status(201).json({
    status: 'success',
    data: { groupId, groupName, docs: results },
  });
});

// ── POST /api/v1/rag/chat ─────────────────────────────────────
exports.chat = catchAsync(async (req, res, next) => {
  const { question, groupId, docIds, language, history } = req.body || {};

  if (!question || typeof question !== 'string' || !question.trim()) {
    return next(new AppError('Please provide a question.', 400));
  }
  if (!groupId) {
    return next(new AppError('Please provide a groupId.', 400));
  }

  const userId = String(req.user.id);
  const tier   = req.user.subscriptionTier || 'free';
  const startTime = Date.now();

  console.log(`[RAG] Chat — user: ${userId}, group: ${groupId}, question: "${question.slice(0, 80)}"`);

  await ensureCanQuery(req.user);
  await ensureCanSendMessage(req.user, 2);

  const groupExists = await RagDocument.exists({ groupId, userId });
  if (!groupExists) {
    return next(new AppError(
      'Document group not found. Please re-upload your file to start a new RAG session.',
      404
    ));
  }

  const { answer, sources, tokenCount, chunkCount, processedQuery } = await ragService.answer({
    question: question.trim(),
    groupId,
    docIds: Array.isArray(docIds) ? docIds : [],
    userId,
    tier,
    language: language || 'auto',
    history:  Array.isArray(history) ? history : [],
  });

  const timeTakenMs = Date.now() - startTime;

  notifySentbot({
    event: 'rag_chat', userId, groupId,
    tokenCount, timeTakenMs, chunkCount,
    docCount: sources.length, tier,
    timestamp: new Date().toISOString(),
  });

  await recordQuery(req.user, tokenCount);
  await recordMessage(req.user, 2);

  res.status(200).json({
    status: 'success',
    data: {
      answer,
      sources,
      processedQuery,
      meta: { timeTakenMs, tokenCount, chunkCount },
    },
  });
});

// ── GET /api/v1/rag/groups ────────────────────────────────────
exports.getGroups = catchAsync(async (req, res) => {
  const userId = String(req.user.id);
  const groups = await RagDocument.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$groupId',
        groupName: { $first: '$groupName' },
        docCount: { $sum: 1 },
        createdAt: { $min: '$createdAt' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).json({ status: 'success', data: { groups } });
});

// ── GET /api/v1/rag/groups/:groupId/docs ─────────────────────
exports.getGroupDocs = catchAsync(async (req, res, next) => {
  const docs = await RagDocument.find({
    groupId: req.params.groupId,
    userId: String(req.user.id),
  }).select('-__v');

  if (!docs.length) return next(new AppError('Group not found.', 404));

  res.status(200).json({ status: 'success', data: { docs } });
});

// ── DELETE /api/v1/rag/docs/:docId ───────────────────────────
exports.deleteDoc = catchAsync(async (req, res, next) => {
  const doc = await RagDocument.findOne({
    docId: req.params.docId,
    userId: String(req.user.id),
  });

  if (!doc) return next(new AppError('Document not found.', 404));

  // Remove vectors from Pinecone / memory store
  await vectorStore.deleteByDocId(req.params.docId);

  // Remove file from disk
  if (doc.storagePath && fs.existsSync(doc.storagePath)) {
    fs.unlinkSync(doc.storagePath);
  }

  await RagDocument.deleteOne({
    docId: req.params.docId,
    userId: String(req.user.id),
  });

  res.status(204).json({ status: 'success', data: null });
});

// ── Admin-only handlers ───────────────────────────────────────

/** GET /api/v1/rag/admin/all-docs — admin sees ALL users' RAG documents */
exports.adminGetAllDocs = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.userId)  filter.userId  = req.query.userId;
  if (req.query.groupId) filter.groupId = req.query.groupId;
  if (req.query.status)  filter.status  = req.query.status;

  const [docs, total] = await Promise.all([
    RagDocument.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    RagDocument.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: docs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { docs },
  });
});

/** GET /api/v1/rag/admin/user/:userId/groups — admin sees a specific user's groups */
exports.adminGetUserGroups = catchAsync(async (req, res) => {
  const groups = await RagDocument.aggregate([
    { $match: { userId: req.params.userId } },
    {
      $group: {
        _id: '$groupId',
        groupName: { $first: '$groupName' },
        docCount:  { $sum: 1 },
        createdAt: { $min: '$createdAt' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).json({ status: 'success', data: { groups } });
});

/** DELETE /api/v1/rag/admin/docs/:docId — admin deletes any document */
exports.adminDeleteDoc = catchAsync(async (req, res, next) => {
  const doc = await RagDocument.findOne({ docId: req.params.docId });
  if (!doc) return next(new AppError('Document not found.', 404));

  await vectorStore.deleteByDocId(req.params.docId);

  if (doc.storagePath && fs.existsSync(doc.storagePath)) {
    fs.unlinkSync(doc.storagePath);
  }

  await RagDocument.deleteOne({ docId: req.params.docId });

  res.status(204).json({ status: 'success', data: null });
});

/** DELETE /api/v1/rag/admin/user/:userId/all — admin wipes all docs for a user */
exports.adminDeleteUserDocs = catchAsync(async (req, res) => {
  const docs = await RagDocument.find({ userId: req.params.userId });

  for (const doc of docs) {
    await vectorStore.deleteByDocId(doc.docId);
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      fs.unlinkSync(doc.storagePath);
    }
  }

  await RagDocument.deleteMany({ userId: req.params.userId });

  res.status(204).json({ status: 'success', data: null });
});
