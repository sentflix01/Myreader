const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    // Price
    planName: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
    },
    price: Number,
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR'],
    },
    // Limits
    maxDocuments: Number,
    maxFileSize: Number,
    maxDailyRequests: Number,
    maxChatSessions: Number,
    maxDocumentsPerChat: Number,
    // Dates
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    trialStart: Date,
    trialEnd: Date,
    cancelledAt: Date,
    // Usage tracking (reset each billing cycle)
    currentPeriodUsage: {
      documentsUploaded: Number,
      requestsMade: Number,
      chatMessagesSent: Number,
      tokensUsed: Number,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
