const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    title: String,
    description: String,
    aiModel: {
      type: String,
      default: 'gpt-4',
    },
    temperature: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 2000,
    },
    file: {
      type: mongoose.Schema.ObjectId,
      ref: 'File',
    },
    systemPrompt: String,
    contextWindow: {
      type: Number,
      default: 10,
    },
    // 📊 RATING FIELDS (ADD THESE)
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must be at most 5.0'],
      set: (val) => Math.round(val * 10) / 10, // e.g., 4.7, 4.3
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    // Statistics
    messageCount: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    userMessageCount: { type: Number, default: 0 },
    aiMessageCount: { type: Number, default: 0 },
    // Timing
    lastMessageAt: Date,
    lastActivityAt: Date,
    // 👥 Sharing – include user reference
    sharedWith: [
      {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' },
        permission: {
          type: String,
          enum: ['read', 'write', 'admin'],
          default: 'read',
        },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Chat', chatSchema);
