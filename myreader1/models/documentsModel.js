const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    // File info
    originalFileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: [
        'pdf',
        'doc',
        'docx',
        'txt',
        'rtf',
        'odt',
        'xls',
        'xlsx',
        'csv',
        'ods',
        'ppt',
        'pptx',
        'odp',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'tiff',
        'svg',
        'webp',
        'html',
        'xml',
        'json',
      ],
      required: true, // ✅ fixed syntax
    },
    mimeType: String,
    fileSize: Number,
    relativePath: String,
    folderId: String,
    folderName: String,
    uploadKind: {
      type: String,
      enum: ['file', 'folder'],
      default: 'file',
    },
    failedReason: String,

    // Storage
    storagePath: String,
    storageKey: String,
    storageProvider: String,
    status: {
      type: String,
      enum: [
        'uploading',
        'queued',
        'processing',
        'extractingText',
        'generatingEmbeddings',
        'completed',
        'failed',
      ],
      default: 'uploading',
    },
    progress: Number,

    // 📊 RATING FIELDS (ADD THESE)
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must be at most 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    // Extracted content
    extractedText: String,
    textLength: Number,
    wordCount: Number,
    pages: [
      {
        pageNumber: Number,
        text: String,
        wordCount: Number,
        hasImages: Boolean,
        dimensions: { width: Number, height: Number },
      },
    ],
    metadata: {
      author: String,
      title: String,
      subject: String,
      keywords: [String],
      language: String,
      createdDate: Date,
      modifiedDate: Date,
      pageCount: Number,
      wordCount: Number,
      characterCount: Number,
      dimensions: { width: Number, height: Number },
      dpi: Number,
      colorSpace: String,
    },
    embeddings: {
      provider: String,
      model: String,
      vector: [Number],
      chunkVectors: [
        {
          chunkId: String,
          vector: [Number],
          embeddingId: String,
        },
      ],
    },
    chunks: [
      {
        chunkId: String,
        pageNumber: Number,
        text: String,
        startIndex: Number,
        endIndex: Number,
        embeddingId: String,
      },
    ],
    isPublic: { type: Boolean, default: false },
    sharingToken: String,
    tags: [String],
    viewCount: { type: Number, default: 0 },
    lastAccessedAt: Date,
    deletedAt: Date,
  },
  { timestamps: true },
);

// Add indexes for performance
documentSchema.index({ user: 1, status: 1 });
documentSchema.index({ user: 1, createdAt: -1 });
documentSchema.index({ user: 1, originalFileName: 1 });
documentSchema.index({ folderId: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ 'chunks.chunkId': 1 });
documentSchema.index({ sharingToken: 1 }, { sparse: true });

// Add pre-save middleware for validation
documentSchema.pre('save', function(next) {
  if (this.extractedText && !this.textLength) {
    this.textLength = this.extractedText.length;
  }
  if (this.extractedText && !this.wordCount) {
    this.wordCount = this.extractedText.split(/\s+/).filter(Boolean).length;
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);
