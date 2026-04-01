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
      default: 'free',
    },
    price: Number,
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR'],
    },
    // Limits
    limits: {
    maxDocuments: { type: Number, default: 5 }, 
    maxFileSizeMB: { type: Number, default: 5 * 1024 }, // 5mB
    maxStorageGB: { type: Number, default: 50 * 1024 }, // 50mB
    maxDailyRequests: { type: Number, default: 50 },
    maxChatSessions: { type: Number, default: 5 },  // 5 chat sessions per day
    maxDailyQueries: { type: Number, default: 20 }, // 20 queries per day
    maxTokensPerDay: { type: Number, default: 50000 }, // 50000 tokens per day
    },
    // Usage tracking (reset each billing cycle)
    
    currentPeriodUsage: {
      documentsUploaded: { type: Number, default: 0 },
      requestsMade: { type: Number, default: 0 },
      chatMessagesSent: { type: Number, default: 0 },
      tokensUsed: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },
      dailyQueries: { type: Number, default: 0 },
      tokensUsedToday: { type: Number, default: 0 },
      chatSessions: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 }, 
    },
    
    // Dates
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    trialStart: Date,
    trialEnd: Date,
    cancelledAt: Date,
    lastUsageReset: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active',
    },
  },
  { timestamps: true },
);


//  CHECK Can perform RAG query
subscriptionSchema.methods.canPerformQuery = function (tokensNeeded = 0) {
  const now = new Date();
  const lastReset = new Date(this.lastUsageReset);

  if (lastReset.toDateString() !== now.toDateString()) {
    this.currentPeriodUsage.dailyQueries = 0;
    this.currentPeriodUsage.tokensUsedToday = 0;
    this.currentPeriodUsage.messagesSent = 0;
    this.lastUsageReset = now;
  } 

  if (this.currentPeriodUsage.dailyQueries >= this.limits.maxDailyQueries) return false;
  if (this.currentPeriodUsage.tokensUsedToday + tokensNeeded > this.limits.maxTokensPerDay) return false;

  return true;
};


//  CHECK Can perform Document upload
subscriptionSchema.methods.canUploadDocument = function (fileSizeMB) {
  const now = new Date();
  const lastReset = new Date(this.lastUsageReset);

  if (lastReset.toDateString() !== now.toDateString()) {
    this.currentPeriodUsage.documentsUploaded = 0;
    this.currentPeriodUsage.storageUsedMB = 0;
    this.lastUsageReset = now;
  } 
  if (this.currentPeriodUsage.documentsUploaded >= this.limits.maxDocuments) return false;
  if (fileSizeMB > this.limits.maxFileSizeMB) return false;
  if (this.currentPeriodUsage.storageUsedMB + fileSizeMB > this.limits.maxStorageMB) return false;

  return true;
};

//  RECORD Document upload
subscriptionSchema.methods.recordDocumentUpload = function (fileSizeMB) {
  this.currentPeriodUsage.documentsUploaded += 1;
  this.currentPeriodUsage.storageUsedMB += fileSizeMB;
  return true;
};


//  RECORD Query usage
subscriptionSchema.methods.recordQuery = function (tokensUsed = 0) {
  this.currentPeriodUsage.dailyQueries += 1;
  this.currentPeriodUsage.tokensUsedToday += tokensUsed;
  this.currentPeriodUsage.requestsMade += 1;
  this.currentPeriodUsage.tokensUsed += tokensUsed; 
  return true;
};


//  RECORD Chat usage
subscriptionSchema.methods.recordMessage = function () {
    this.currentPeriodUsage.messagesSent += 1;
    this.currentPeriodUsage.chatMessagesSent += 1;
    this.currentPeriodUsage.tokensUsed += tokensUsed;
    return true;
  };


//  APPLY PLAN DEFAULTS
subscriptionSchema.methods.applyPlanDefaults = function () {
  const plans = {
    free: {
      limits: {
        maxDocuments: 5,
        maxFileSizeMB: 5,
        maxStorageMB: 50,
        maxDailyQueries: 20,
        maxTokensPerDay: 50000,
        maxChatSessions: 2,
      },
    },
    premium: {
      limits: {
        maxDocuments: 50,
        maxFileSizeMB: 20,
        maxStorageMB: 500,
        maxDailyQueries: 200,
        maxTokensPerDay: 500000,
        maxChatSessions: 10,
      },
    },    
    enterprise: {
      limits: {
        maxDocuments: unlimited,
        maxFileSizeMB: unlimited,
        maxStorageMB: unlimited,
        maxDailyQueries: unlimited,
        maxTokensPerDay: unlimited,
        maxChatSessions: unlimited,
      },
    },
  };
  this.limits = plans[this.planName].limits;
}
subscriptionSchema.pre('save', async function () {
  if (!this.isModified('planName')) return;
  this.applyPlanDefaults();
}); 

module.exports = mongoose.model('Subscription', subscriptionSchema);



/* const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },

    // ================================
    // 💰 PLAN
    // ================================
    planName: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active',
    },

    // ================================
    // 📦 RAG LIMITS
    // ================================
    limits: {
      maxDocuments: { type: Number, default: 5 },
      maxFileSizeMB: { type: Number, default: 5 },
      maxStorageMB: { type: Number, default: 50 },

      maxDailyQueries: { type: Number, default: 20 }, // retrieval + generation
      maxTokensPerDay: { type: Number, default: 50000 },

      maxChatSessions: { type: Number, default: 2 },
      maxMessagesPerChat: { type: Number, default: 50 },
    },

    // ================================
    // 📊 USAGE TRACKING
    // ================================
    usage: {
      documentsUploaded: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },

      dailyQueries: { type: Number, default: 0 },
      tokensUsedToday: { type: Number, default: 0 },

      chatSessions: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
    },

    lastUsageReset: {
      type: Date,
      default: Date.now,
    },

    // ================================
    // 📅 BILLING / PERIOD
    // ================================
    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    cancelledAt: Date,
  },
  { timestamps: true }
);


// ========================================
// 🔄 Reset daily usage
// ========================================
subscriptionSchema.methods.resetDailyUsageIfNeeded = function () {
  const now = new Date();
  const lastReset = new Date(this.lastUsageReset);

  if (lastReset.toDateString() !== now.toDateString()) {
    this.usage.dailyQueries = 0;
    this.usage.tokensUsedToday = 0;
    this.usage.messagesSent = 0;
    this.lastUsageReset = now;
  }
};


// ========================================
// ✅ CHECK: Can upload document
// ========================================
subscriptionSchema.methods.canUploadDocument = function (fileSizeMB) {
  if (this.status !== 'active' && this.status !== 'trial') return false;

  if (this.usage.documentsUploaded >= this.limits.maxDocuments) return false;

  if (fileSizeMB > this.limits.maxFileSizeMB) return false;

  if (
    this.usage.storageUsedMB + fileSizeMB >
    this.limits.maxStorageMB
  )
    return false;

  return true;
};


// ========================================
// ✅ CHECK: Can perform RAG query
// ========================================
subscriptionSchema.methods.canQuery = function (tokensNeeded = 0) {
  this.resetDailyUsageIfNeeded();

  if (this.status !== 'active' && this.status !== 'trial') return false;

  if (this.usage.dailyQueries >= this.limits.maxDailyQueries)
    return false;

  if (
    this.usage.tokensUsedToday + tokensNeeded >
    this.limits.maxTokensPerDay
  )
    return false;

  return true;
};


// ========================================
// ➕ RECORD: Document upload
// ========================================
subscriptionSchema.methods.recordUpload = function (fileSizeMB) {
  this.usage.documentsUploaded += 1;
  this.usage.storageUsedMB += fileSizeMB;
};


// ========================================
// ➕ RECORD: Query usage
// ========================================
subscriptionSchema.methods.recordQuery = function (tokensUsed = 0) {
  this.resetDailyUsageIfNeeded();

  this.usage.dailyQueries += 1;
  this.usage.tokensUsedToday += tokensUsed;
};


// ========================================
// ➕ RECORD: Chat usage
// ========================================
subscriptionSchema.methods.recordMessage = function () {
  this.resetDailyUsageIfNeeded();

  this.usage.messagesSent += 1;
};


// ========================================
// 🎯 APPLY PLAN DEFAULTS
// ========================================
subscriptionSchema.methods.applyPlanDefaults = function () {
  const plans = {
    free: {
      limits: {
        maxDocuments: 5,
        maxFileSizeMB: 5,
        maxStorageMB: 50,
        maxDailyQueries: 20,
        maxTokensPerDay: 50000,
        maxChatSessions: 2,
        maxMessagesPerChat: 50,
      },
    },

    pro: {
      limits: {
        maxDocuments: 50,
        maxFileSizeMB: 20,
        maxStorageMB: 500,
        maxDailyQueries: 200,
        maxTokensPerDay: 500000,
        maxChatSessions: 10,
        maxMessagesPerChat: 200,
      },
    },

    enterprise: {
      limits: {
        maxDocuments: 500,
        maxFileSizeMB: 100,
        maxStorageMB: 5000,
        maxDailyQueries: 1000,
        maxTokensPerDay: 5000000,
        maxChatSessions: 50,
        maxMessagesPerChat: 1000,
      },
    },
  };

  this.limits = plans[this.planName].limits;
};


module.exports = mongoose.model('Subscription', subscriptionSchema);*/
