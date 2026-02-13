const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat',
    },

    // Message content
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'function']
    },
    content: String,              // The message text
    contentType: String,          // 'text', 'file', 'code'

    // For AI responses
    aiModel: String,              // Which model generated this
    temperature: Number,

    // Tokens and cost
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number,
    estimatedCost: Number,        // In USD

    // Document context
    documentReferences: [{
      // documentId: ObjectId,
      pageNumber: Number,
      chunkId: String,            // Which chunk was referenced
      confidence: Number,         // How relevant
      textSnippet: String         // The actual referenced text
    }],

    // For citations
    citations: [{
      // documentId: ObjectId,
      sourceText: String,
      pageNumber: Number,
      url: String,                // If web source
      timestamp: Date
    }],

    // For function calls (if using tools)
    functionCall: {
      name: String,
      arguments: Object,
      result: String
    },

    // Processing metadata
    processingTime: Number,        // Milliseconds
    processingStartedAt: Date,
    processingCompletedAt: Date,

    // Message status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
    },

    // User info
    // userId: ObjectId,            // Who sent/received

    // For threaded conversations
    // parentMessageId: ObjectId,   // For replies
    // threadId: ObjectId,          // For grouping messages

    // Ratings/feedback
    userFeedback: {
      rating: Number,             // 1-5
      feedbackText: String,
      helpful: Boolean,
      reported: Boolean
    },

    // Metadata
    metadata: {
      language: String,
      sentiment: String,          // 'positive', 'negative', 'neutral'
      entities: [String],         // Named entities detected
    },

    sender: {
      type: String,
      enum: ['user', 'ai'],
    },
    tokensUsed: Number,
    createdAt: Date,
    updatedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
