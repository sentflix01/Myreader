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

const serializeLimit = (value) => (isUnlimited(value) ? 'unlimited' : value);

const getRemainingLimit = (used, limit) =>
  isUnlimited(limit) ? 'unlimited' : Math.max(limit - Number(used || 0), 0);

const getUsageSnapshot = (user) => {
  resetUsageIfNeeded(user);
  const plan = getPlan(user);

  return {
    tier: normalizeTier(user.subscriptionTier),
    label: plan.label,
    status: user.subscriptionStatus || 'active',
    cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
    enforcementEnabled: shouldEnforceLimits(),
    usage: {
      uploads: Number(user.dailyUsage.uploads || 0),
      queries: Number(user.dailyUsage.queries || 0),
      messages: Number(user.dailyUsage.messages || 0),
      chatSessions: Number(user.dailyUsage.chatSessions || 0),
      tokensUsed: Number(user.dailyUsage.tokensUsed || 0),
      windowStartedAt: user.dailyUsage.windowStartedAt,
    },
    lifetime: {
      documentsUploadedCount: Number(user.documentsUploadedCount || 0),
      totalQueriesAsked: Number(user.totalQueriesAsked || 0),
      totalChatMessages: Number(user.totalChatMessages || 0),
      totalTokensUsed: Number(user.totalTokensUsed || 0),
    },
    limits: Object.fromEntries(
      Object.entries(plan.limits).map(([key, value]) => [key, serializeLimit(value)]),
    ),
    remaining: {
      uploads: getRemainingLimit(user.dailyUsage.uploads, plan.limits.maxDailyUploads),
      queries: getRemainingLimit(user.dailyUsage.queries, plan.limits.maxDailyQueries),
      messages: getRemainingLimit(user.dailyUsage.messages, plan.limits.maxDailyMessages),
      chatSessions: getRemainingLimit(
        user.dailyUsage.chatSessions,
        plan.limits.maxChatSessions,
      ),
      tokens: getRemainingLimit(user.dailyUsage.tokensUsed, plan.limits.maxDailyTokens),
    },
  };
};

const ensureCanUpload = async (
  user,
  { fileSizeBytes = 0, existingDocumentsCount } = {},
) => {
  if (user.subscriptionStatus !== 'active') {
    throw new AppError('Subscription inactive. Upgrade to upload.', 403);
  }

  resetUsageIfNeeded(user);
  const plan = getPlan(user);
  const sizeMB = fileSizeBytes / (1024 * 1024);
  const documentCount =
    typeof existingDocumentsCount === 'number'
      ? existingDocumentsCount
      : await Document.countDocuments({ user: user.id });

  if (sizeMB > plan.limits.maxFileSizeMB) {
    throw new AppError(`File too large for ${plan.label} plan`, 413);
  }

  if (
    shouldEnforceLimits() &&
    !isUnlimited(plan.limits.maxDocuments) &&
    documentCount >= plan.limits.maxDocuments
  ) {
    throw new AppError(`Document limit reached for ${plan.label} plan`, 429);
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

const ensureCanStartChatSession = async (user) => {
  if (user.subscriptionStatus !== 'active') {
    throw new AppError('Subscription inactive. Upgrade to start chats.', 403);
  }

  resetUsageIfNeeded(user);
  const plan = getPlan(user);

  if (
    shouldEnforceLimits() &&
    user.dailyUsage.chatSessions >= plan.limits.maxChatSessions
  ) {
    throw new AppError('Daily chat session limit reached', 429);
  }
};

const ensureCanSendMessage = async (user, messageCount = 1) => {
  if (user.subscriptionStatus !== 'active') {
    throw new AppError('Subscription inactive. Upgrade to continue chatting.', 403);
  }

  resetUsageIfNeeded(user);
  const plan = getPlan(user);

  if (
    shouldEnforceLimits() &&
    user.dailyUsage.messages + messageCount > plan.limits.maxDailyMessages
  ) {
    throw new AppError('Daily message limit reached', 429);
  }
};

const recordQuery = async (user, tokens = 0) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.queries += 1;
  user.dailyUsage.tokensUsed += tokens;
  user.totalQueriesAsked = Number(user.totalQueriesAsked || 0) + 1;
  user.totalTokensUsed = Number(user.totalTokensUsed || 0) + tokens;
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

const recordChatSession = async (user) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.chatSessions += 1;
  user.lastActiveAt = new Date();
  user.markModified('dailyUsage');
  await user.save({ validateBeforeSave: false });
};

const recordMessage = async (user, messageCount = 1) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.messages += messageCount;
  user.totalChatMessages = Number(user.totalChatMessages || 0) + messageCount;
  user.lastActiveAt = new Date();
  user.markModified('dailyUsage');
  await user.save({ validateBeforeSave: false });
};

module.exports = {
  PLAN_CATALOG,
  normalizeTier,
  getPlan,
  getUsageSnapshot,
  ensureCanUpload,
  ensureCanQuery,
  ensureCanStartChatSession,
  ensureCanSendMessage,
  recordQuery,
  recordUpload,
  recordChatSession,
  recordMessage,
};
