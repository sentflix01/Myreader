/**
 * ============================================================
 * FILE: model/ragModel.js
 * ============================================================
 * PURPOSE:
 *   Mongoose schema for RAG document metadata. Stores everything
 *   about an ingested document EXCEPT the raw vectors (those live
 *   in Pinecone or the in-memory store). This model is the source
 *   of truth for group membership, tier, status, and file info.
 *
 * HOW TO INTEGRATE:
 *   Already imported by ragController.js. No changes needed.
 *
 * MVC ROLE: Model — data shape + DB interaction for RAG docs.
 *
 * DOCUMENT GROUP FEATURE:
 *   - groupId: UUID or user-supplied name. All docs in the same
 *     group share this ID. Used to filter vector searches.
 *   - groupName: Human-readable label shown in the UI.
 *   - docId: UUID per document. Used to filter to specific files.
 *
 * AMHARIC NOTE:
 *   originalFilename and groupName are stored as UTF-8 strings.
 *   Mongoose + MongoDB handle Ge'ez script natively.
 *
 * SCALING NOTE:
 *   Add a TTL index on createdAt if you want auto-expiry for free
 *   tier documents:
 *     ragDocSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
 * ============================================================
 */

'use strict';

const mongoose = require('mongoose');

const ragDocSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    docId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    groupName: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Ownership ─────────────────────────────────────────────
    userId: {
      type: String,   // stored as string (ObjectId.toString()) for easy Pinecone metadata
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },

    // ── File info ─────────────────────────────────────────────
    originalFilename: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,   // absolute path on disk (or S3 key in future)
    },
    sourceType: {
      type: String,
      enum: ['pdf', 'docx', 'xlsx', 'txt', 'html', 'url', 'text'],
      required: true,
    },
    fileSize: Number,

    // ── Processing stats ──────────────────────────────────────
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    textLength: {
      type: Number,
      default: 0,
    },
    errorMessage: String,

    // ── Usage stats (updated by ragService on each chat) ──────
    queryCount: {
      type: Number,
      default: 0,
    },
    lastQueriedAt: Date,
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
  },
);

// Compound index for fast group + user lookups
ragDocSchema.index({ groupId: 1, userId: 1 });

module.exports = mongoose.model('RagDocument', ragDocSchema);
