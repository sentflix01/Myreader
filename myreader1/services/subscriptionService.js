const Document = require('../models/documentsModel');
const AppError = require('../utils/appError');

const UNLIMITED = Number.MAX_SAFE_INTEGER;

const PLAN_CATALOG = {
  free: {
    id: 'free',
    label: 'Free',
    price: { monthly: 0, yearly: 0 },
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
    id: 'premium',
    label: 'Premium',
    price: { monthly: 9, yearly: 90 },
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
    id: 'enterprise',
    label: 'Enterprise',
    price: { monthly: null, yearly: null },
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

const ACTIVE_DOCUMENT_FILTER = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

const BILLING_INTERVALS = ['monthly', 'yearly'];

const normalizeTier = (tier) => (PLAN_CATALOG[tier] ? tier : 'free');

const normalizeInterval = (interval) =>
  BILLING_INTERVALS.includes(interval) ? interval : 'monthly';

const isUnlimited = (value) => value >= UNLIMITED;
const shouldEnforceUsageLimits = () =>
  process.env.NODE_ENV === 'production' ||
  String(process.env.ENFORCE_USAGE_LIMITS || '').toLowerCase() === 'true';

const estimateTokens = (text = '') => {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.5));
};

const startOfUsageWindow = (date = new Date()) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const ensureUsageShape = (user) => {
  if (!user.dailyUsage) user.dailyUsage = {};
  user.dailyUsage.windowStartedAt =
    user.dailyUsage.windowStartedAt || startOfUsageWindow();
  user.dailyUsage.uploads = Number(user.dailyUsage.uploads || 0);
  user.dailyUsage.queries = Number(user.dailyUsage.queries || 0);
  user.dailyUsage.messages = Number(user.dailyUsage.messages || 0);
  user.dailyUsage.chatSessions = Number(user.dailyUsage.chatSessions || 0);
  user.dailyUsage.tokensUsed = Number(user.dailyUsage.tokensUsed || 0);
};

const resetUsageIfNeeded = (user, now = new Date()) => {
  ensureUsageShape(user);
  const currentWindow = startOfUsageWindow(now).getTime();
  const storedWindow = new Date(user.dailyUsage.windowStartedAt).getTime();

  if (storedWindow === currentWindow) return false;

  user.dailyUsage.windowStartedAt = new Date(currentWindow);
  user.dailyUsage.uploads = 0;
  user.dailyUsage.queries = 0;
  user.dailyUsage.messages = 0;
  user.dailyUsage.chatSessions = 0;
  user.dailyUsage.tokensUsed = 0;
  return true;
};

const persistUsage = async (user) => {
  user.markModified('dailyUsage');
  await user.save({ validateBeforeSave: false });
};

const ensureSubscriptionIsUsable = (user) => {
  if (
    user.subscriptionStatus === 'cancelled' ||
    user.subscriptionStatus === 'expired'
  ) {
    throw new AppError(
      'Your subscription is inactive. Please choose a plan to continue.',
      403,
    );
  }
};

const getPlanForUser = (user) =>
  PLAN_CATALOG[normalizeTier(user?.subscriptionTier)];

const buildBillingCapabilities = () => ({
  direct: true,
  stripeConfigured:
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    (process.env.STRIPE_MOCK || 'false').toLowerCase() !== 'true',
  mockMode: (process.env.STRIPE_MOCK || 'false').toLowerCase() === 'true',
});

const buildSubscriptionSummary = (user) => {
  const tier = normalizeTier(user?.subscriptionTier);
  const interval = normalizeInterval(user?.billingInterval);

  return {
    tier,
    status: user?.subscriptionStatus || 'active',
    interval,
    provider: user?.billingProvider || 'direct',
    currentPeriodEnd: user?.currentPeriodEnd || null,
    trialEndsAt: user?.trialEndsAt || null,
    stripeSubscriptionId: user?.stripeSubscriptionId || null,
    plan: PLAN_CATALOG[tier],
    usage: {
      uploads: Number(user?.dailyUsage?.uploads || 0),
      queries: Number(user?.dailyUsage?.queries || 0),
      messages: Number(user?.dailyUsage?.messages || 0),
      chatSessions: Number(user?.dailyUsage?.chatSessions || 0),
      tokensUsed: Number(user?.dailyUsage?.tokensUsed || 0),
    },
    capabilities: buildBillingCapabilities(),
  };
};

const buildPeriodEnd = (interval = 'monthly', from = new Date()) => {
  const next = new Date(from);
  if (normalizeInterval(interval) === 'yearly')
    next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const applyPlanToUser = (
  user,
  {
    tier = 'free',
    interval = 'monthly',
    provider = 'direct',
    status = 'active',
    customerId,
    subscriptionId,
    priceId,
    currentPeriodEnd,
    trialEndsAt,
  } = {},
) => {
  const normalizedTier = normalizeTier(tier);

  user.subscriptionTier = normalizedTier;
  user.subscriptionStatus = status;
  user.billingInterval = normalizeInterval(interval);
  user.billingProvider = provider;
  user.subscriptionUpdatedAt = new Date();

  if (customerId !== undefined) user.stripeCustomerId = customerId;

  if (normalizedTier === 'free') {
    user.stripeSubscriptionId = undefined;
    user.stripePriceId = undefined;
    user.currentPeriodEnd = undefined;
    user.trialEndsAt = undefined;
    return user;
  }

  if (subscriptionId !== undefined) user.stripeSubscriptionId = subscriptionId;
  if (priceId !== undefined) user.stripePriceId = priceId;
  if (currentPeriodEnd !== undefined) user.currentPeriodEnd = currentPeriodEnd;
  if (trialEndsAt !== undefined) user.trialEndsAt = trialEndsAt;

  return user;
};

const cancelPlanOnUser = (user) =>
  applyPlanToUser(user, {
    tier: 'free',
    interval: 'monthly',
    provider: 'direct',
    status: 'active',
  });

const maybePersistReset = async (user) => {
  if (resetUsageIfNeeded(user)) await persistUsage(user);
};

const ensureCanCreateChat = async (user) => {
  ensureSubscriptionIsUsable(user);
  await maybePersistReset(user);

  const plan = getPlanForUser(user);
  if (!shouldEnforceUsageLimits()) return { plan };

  if (
    !isUnlimited(plan.limits.maxChatSessions) &&
    user.dailyUsage.chatSessions >= plan.limits.maxChatSessions
  ) {
    throw new AppError(
      'You have reached your daily chat session limit for this plan.',
      429,
    );
  }
};

const recordChatCreated = async (user) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.chatSessions += 1;
  user.lastActiveAt = new Date();
  await persistUsage(user);
};

const ensureCanUpload = async (user, { fileSizeBytes = 0 } = {}) => {
  ensureSubscriptionIsUsable(user);
  await maybePersistReset(user);

  const plan = getPlanForUser(user);
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  if (
    Number.isFinite(plan.limits.maxFileSizeMB) &&
    fileSizeMB > plan.limits.maxFileSizeMB
  ) {
    throw new AppError(
      `This file is too large for the ${plan.label} plan.`,
      400,
    );
  }

  if (
    shouldEnforceUsageLimits() &&
    !isUnlimited(plan.limits.maxDailyUploads) &&
    user.dailyUsage.uploads >= plan.limits.maxDailyUploads
  ) {
    throw new AppError(
      'You have reached your daily upload limit for this plan.',
      429,
    );
  }

  if (!isUnlimited(plan.limits.maxDocuments)) {
    const totalDocuments = await Document.countDocuments({
      user: user.id,
      ...ACTIVE_DOCUMENT_FILTER,
    });

    if (totalDocuments >= plan.limits.maxDocuments) {
      throw new AppError(
        `Document limit reached (${plan.limits.maxDocuments}/${plan.limits.maxDocuments}) for ${plan.label} plan. Please upgrade to continue uploading.`,
        403,
      );
    }
  }

  return { plan, fileSizeMB };
};

const recordUpload = async (user) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.uploads += 1;
  user.documentsUploadedCount = Number(user.documentsUploadedCount || 0) + 1;
  user.lastActiveAt = new Date();
  await persistUsage(user);
};

const recordUploads = async (user, count = 1) => {
  const safeCount = Math.max(0, Number(count || 0));
  if (!safeCount) return;

  resetUsageIfNeeded(user);
  user.dailyUsage.uploads += safeCount;
  user.documentsUploadedCount =
    Number(user.documentsUploadedCount || 0) + safeCount;
  user.lastActiveAt = new Date();
  await persistUsage(user);
};

const ensureCanUploadFolder = async (user, { files = [] } = {}) => {
  ensureSubscriptionIsUsable(user);
  await maybePersistReset(user);

  const plan = getPlanForUser(user);
  if (normalizeTier(user?.subscriptionTier) !== 'enterprise') {
    throw new AppError(
      'Folder uploads are available only on the Enterprise plan.',
      403,
    );
  }

  const oversized = (files || []).find((file) => {
    const fileSizeMB = Number(file?.size || 0) / (1024 * 1024);
    return (
      Number.isFinite(plan.limits.maxFileSizeMB) &&
      fileSizeMB > plan.limits.maxFileSizeMB
    );
  });

  if (oversized) {
    throw new AppError(
      `The file "${oversized.originalname || oversized.name || 'unknown'}" is too large for the ${plan.label} plan.`,
      400,
    );
  }

  return { plan, fileCount: Array.isArray(files) ? files.length : 0 };
};

const ensureCanAsk = async (user, { text = '', asMessage = false } = {}) => {
  ensureSubscriptionIsUsable(user);
  await maybePersistReset(user);

  const plan = getPlanForUser(user);
  const tokensEstimated = estimateTokens(text);
  const shouldEnforce = shouldEnforceUsageLimits();

  if (
    shouldEnforce &&
    !isUnlimited(plan.limits.maxDailyQueries) &&
    user.dailyUsage.queries >= plan.limits.maxDailyQueries
  ) {
    throw new AppError(
      'You have reached your daily query limit for this plan.',
      429,
    );
  }

  if (
    shouldEnforce &&
    asMessage &&
    !isUnlimited(plan.limits.maxDailyMessages) &&
    user.dailyUsage.messages >= plan.limits.maxDailyMessages
  ) {
    throw new AppError(
      `Daily chat message limit reached (${user.dailyUsage.messages}/${plan.limits.maxDailyMessages}) for ${plan.label} plan. Resets tomorrow. Upgrade to get more.`,
      429,
    );
  }

  if (
    shouldEnforce &&
    !isUnlimited(plan.limits.maxDailyTokens) &&
    user.dailyUsage.tokensUsed + tokensEstimated > plan.limits.maxDailyTokens
  ) {
    throw new AppError(
      'You have reached your daily token budget for this plan.',
      429,
    );
  }

  return { plan, tokensEstimated };
};

const recordQuery = async (
  user,
  { tokensEstimated = 0, asMessage = false } = {},
) => {
  resetUsageIfNeeded(user);
  user.dailyUsage.queries += 1;
  user.dailyUsage.tokensUsed += tokensEstimated;
  user.totalQueriesAsked = Number(user.totalQueriesAsked || 0) + 1;

  if (asMessage) {
    user.dailyUsage.messages += 1;
    user.totalChatMessages = Number(user.totalChatMessages || 0) + 1;
  }

  user.totalTokensUsed = Number(user.totalTokensUsed || 0) + tokensEstimated;
  user.lastActiveAt = new Date();
  await persistUsage(user);
};

module.exports = {
  PLAN_CATALOG,
  applyPlanToUser,
  buildBillingCapabilities,
  buildPeriodEnd,
  buildSubscriptionSummary,
  cancelPlanOnUser,
  ensureCanAsk,
  ensureCanCreateChat,
  ensureCanUpload,
  ensureCanUploadFolder,
  estimateTokens,
  getPlanForUser,
  normalizeInterval,
  normalizeTier,
  recordChatCreated,
  recordQuery,
  recordUpload,
  recordUploads,
};
