const Document = require('../model/documentsModel');
const AppError = require('../utils/appError');

const UNLIMITED = Number.MAX_SAFE_INTEGER;

const PLAN_CATALOG = {
  free: {
    label: 'Free',
    limits: {
      maxDocuments: 5,
      maxFileSizeMB: 10,
      maxDailyUploads: 3,
      maxDailyQueries: 5,
      maxDailyMessages: 25,
      maxChatSessions: 3,
      maxDailyTokens: 50000,
    },
  },
  premium: {
    label: 'Premium',
    limits: {
      maxDocuments: 50,
      maxFileSizeMB: 25,
      maxDailyUploads: 25,
      maxDailyQueries: 250,
      maxDailyMessages: 500,
      maxChatSessions: 75,
      maxDailyTokens: 600000,
    },
  },
  enterprise: {
    label: 'Enterprise',
    limits: {
      maxDocuments: UNLIMITED,
      maxFileSizeMB: 100,
      maxDailyUploads: UNLIMITED,
      maxDailyQueries: UNLIMITED,
      maxDailyMessages: UNLIMITED,
      maxChatSessions: UNLIMITED,
      maxDailyTokens: UNLIMITED,
    },
  },
};

const normalizeTier = (tier) => (PLAN_CATALOG[tier] ? tier : 'free');

const isUnlimited = (value) => value >= UNLIMITED;

const shouldEnforceLimits = () =>
  process.env.NODE_ENV === 'production' ||
  process.env.ENFORCE_USAGE_LIMITS === 'true';

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const ensureUsageShape = (user) => {
  if (!user.dailyUsage) user.dailyUsage = {};
  user.dailyUsage.windowStartedAt =
    user.dailyUsage.windowStartedAt || startOfDay();
  ['uploads', 'queries', 'messages', 'chatSessions', 'tokensUsed'].forEach(
    (k) => {
      user.dailyUsage[k] = Number(user.dailyUsage[k] || 0);
    },
  );
};

const resetUsageIfNeeded = (user) => {
  ensureUsageShape(user);
  const now = startOfDay();
  const stored = new Date(user.dailyUsage.windowStartedAt);
  if (stored.toDateString() === now.toDateString()) return false;

  user.dailyUsage = {
    windowStartedAt: now,
    uploads: 0,
    queries: 0,
    messages: 0,
    chatSessions: 0,
    tokensUsed: 0,
  };
  return true;
};

const getPlan = (user) => PLAN_CATALOG[normalizeTier(user.subscriptionTier)];

const ensureCanUpload = async (user, { fileSizeBytes = 0 } = {}) => {
  if (user.subscriptionStatus !== 'active') {
    throw new AppError('Subscription inactive. Upgrade to upload.', 403);
  }

  resetUsageIfNeeded(user);
  const plan = getPlan(user);
  const sizeMB = fileSizeBytes / (1024 * 1024);

  if (sizeMB > plan.limits.maxFileSizeMB) {
    throw new AppError(`File too large for ${plan.label} plan`, 413);
  }

  if (
    shouldEnforceLimits() &&
    user.dailyUsage.uploads >= plan.limits.maxDailyUploads
  ) {
    throw new AppError('Daily upload limit reached', 429);
  }
};

const ensureCanQuery = async (user, tokens = 0) => {
  if (user.subscriptionStatus !== 'active') {
    throw new AppError('Subscription inactive. Upgrade for RAG queries.', 403);
  }

  resetUsageIfNeeded(user);
  const plan = getPlan(user);

  if (
    shouldEnforceLimits() &&
    user.dailyUsage.queries >= plan.limits.maxDailyQueries
  ) {
    throw new AppError('Daily query limit reached', 429);
  }

  if (
    shouldEnforceLimits() &&
    user.dailyUsage.tokensUsed + tokens > plan.limits.maxDailyTokens
  ) {
    throw new AppError('Daily token limit reached', 429);
  }
};

const recordQuery = async (user, tokens = 0) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.queries += 1;
  user.dailyUsage.tokensUsed += tokens;
  user.lastActiveAt = new Date();
  user.markModified('dailyUsage');
  await user.save({ validateBeforeSave: false });
};

const recordUpload = async (user) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.uploads += 1;
  user.documentsUploadedCount = (user.documentsUploadedCount || 0) + 1;
  user.lastActiveAt = new Date();
  user.markModified('dailyUsage');
  await user.save({ validateBeforeSave: false });
};

module.exports = {
  PLAN_CATALOG,
  normalizeTier,
  getPlan,
  ensureCanUpload,
  ensureCanQuery,
  recordQuery,
  recordUpload,
};
