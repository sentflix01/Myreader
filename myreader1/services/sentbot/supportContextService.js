const Chat = require('../../models/chatsModel');
const Document = require('../../models/documentsModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');
const {
  PLAN_CATALOG,
  buildBillingCapabilities,
  buildSubscriptionSummary,
} = require('../subscriptionService');
const { getLocalizedCopy } = require('../../utils/languageSupport');

const ACTIVE_DOCUMENT_FILTER = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

const SUPPORT_FEATURES = [
  'Upload documents and chat with them on the Chat page',
  'Track personal activity from the dashboard',
  'View subscription plan, billing interval, and usage limits',
  'Upgrade between Free, Premium, and Enterprise plans',
  'Review recent chats, documents, and account activity',
  'See public dashboard totals like users, documents, reviews, and tier distribution',
];

function isDocumentQuestion(message = '') {
  const lower = String(message).toLowerCase();
  if (!lower.trim()) return false;

  const explicitDocumentIntent =
    /(according to|from the (uploaded )?(document|pdf|file)|in (my )?(document|pdf|file)|what does .* (document|pdf|file) say|summari[sz]e|summary of|quote|excerpt|clause|section|page \d+|ሰነድ|ፋይል|ማጠቃለያ|ክፍል|ገጽ)/.test(
      lower,
    );

  const supportIntent =
    /(how many|count|usage|upload(s|ed)?|queries|questions|messages|chat(s)?|subscription|plan|billing|upgrade|price|dashboard|users|site|platform|feature|support|activity|limit|quota|አጠቃቀም|ሰቀላ|ጥያቄ|መልዕክት|ቻት|ምዝገባ|ፕላን|ክፍያ|ዳሽቦርድ|ባህሪ|ድጋፍ)/.test(
      lower,
    );

  if (explicitDocumentIntent) return true;
  if (supportIntent) return false;

  return /(document|pdf|uploaded file|my file|ሰነድ|ፋይል)/.test(lower);
}

function buildDocumentRedirectReply(language = 'en') {
  return getLocalizedCopy(language, 'sentbot.documentRedirect');
}

function normalizeGroupedCounts(rows = []) {
  return rows.reduce((acc, row) => {
    if (!row || row._id === undefined || row._id === null) return acc;
    acc[String(row._id)] = Number(row.count || 0);
    return acc;
  }, {});
}

function formatGroupedCounts(values = {}) {
  const entries = Object.entries(values).filter(([, count]) => Number(count) > 0);
  if (!entries.length) return 'none recorded';
  return entries.map(([label, count]) => `${label}: ${count}`).join(', ');
}

function summarizePlans() {
  return Object.values(PLAN_CATALOG).map((plan) => ({
    id: plan.id,
    label: plan.label,
    price: plan.price,
    limits: plan.limits,
  }));
}

function buildSupportContext(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

function buildFallbackSupportAnswer({ message, snapshot, language = 'en' }) {
  const lower = String(message || '').toLowerCase();
  const userUsage = snapshot?.user?.usage || {};
  const siteTotals = snapshot?.site?.totals || {};
  const siteUsage = snapshot?.site?.usageTotals || {};
  const subscription = snapshot?.user?.subscription || {};
  const billing = snapshot?.site?.billing || {};

  if (isDocumentQuestion(lower)) {
    return buildDocumentRedirectReply(language);
  }

  if (/(query|question|ask|ጥያቄ)/.test(lower)) {
    return getLocalizedCopy(language, 'sentbot.fallback.queries', {
      todayQueries: userUsage.todayQueries || 0,
      totalQueries: userUsage.totalQueries || 0,
      todayMessages: userUsage.todayMessages || 0,
    });
  }

  if (/(upload|document|file|ሰቀላ|ሰነድ|ፋይል)/.test(lower)) {
    return getLocalizedCopy(language, 'sentbot.fallback.uploads', {
      totalDocuments: userUsage.totalDocuments || 0,
      totalUploads: userUsage.totalUploads || 0,
      todayUploads: userUsage.todayUploads || 0,
    });
  }

  if (/(message|chat|መልዕክት|ቻት)/.test(lower)) {
    return getLocalizedCopy(language, 'sentbot.fallback.messages', {
      totalChats: userUsage.totalChats || 0,
      todayMessages: userUsage.todayMessages || 0,
      totalMessages: userUsage.totalMessages || 0,
    });
  }

  if (/(subscription|plan|billing|upgrade|premium|enterprise|free|price|ምዝገባ|ፕላን|ክፍያ|አሻሽል)/.test(lower)) {
    return getLocalizedCopy(language, 'sentbot.fallback.subscription', {
      tier: subscription.tier || 'free',
      interval: subscription.interval || 'monthly',
      status: subscription.status || 'active',
      directCheckout: billing.direct ? 'available' : 'not available',
      stripeCheckout: billing.stripeConfigured ? 'configured' : 'not configured',
    });
  }

  if (/(dashboard|site|platform|overall|all users|public|general|feature|ዳሽቦርድ|ጣቢያ|መድረክ|የህዝብ|ባህሪ)/.test(lower)) {
    return getLocalizedCopy(language, 'sentbot.fallback.dashboard', {
      totalUsers: siteTotals.totalUsers || 0,
      totalDocuments: siteTotals.totalDocuments || 0,
      totalReviews: siteTotals.totalReviews || 0,
      totalUploads: siteUsage.totalUploads || 0,
      totalQueries: siteUsage.totalQueries || 0,
      totalMessages: siteUsage.totalMessages || 0,
      usersByTier: formatGroupedCounts(snapshot?.site?.usersByTier),
      documentsByType: formatGroupedCounts(snapshot?.site?.documentsByType),
      features: (snapshot?.site?.features || SUPPORT_FEATURES).join(', '),
    });
  }

  return getLocalizedCopy(language, 'sentbot.genericReply');
}

async function getSupportSnapshot({ userId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const [
    totalDocuments,
    totalChats,
    totalReviews,
    recentDocuments,
    recentChats,
    publicCounts,
    documentTypes,
    usersByTier,
    siteUsageAgg,
  ] = await Promise.all([
    Document.countDocuments({ user: userId, ...ACTIVE_DOCUMENT_FILTER }),
    Chat.countDocuments({ user: userId }),
    Review.countDocuments({ user: userId }),
    Document.find({ user: userId, ...ACTIVE_DOCUMENT_FILTER })
      .sort('-updatedAt')
      .limit(5)
      .select('originalFileName updatedAt'),
    Chat.find({ user: userId })
      .sort('-updatedAt')
      .limit(5)
      .select('title updatedAt messageCount'),
    Promise.all([
      User.countDocuments(),
      Document.countDocuments(ACTIVE_DOCUMENT_FILTER),
      Review.countDocuments(),
    ]),
    Document.aggregate([
      { $match: ACTIVE_DOCUMENT_FILTER },
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      {
        $group: {
          _id: null,
          totalUploads: { $sum: '$documentsUploadedCount' },
          totalQueries: { $sum: '$totalQueriesAsked' },
          totalMessages: { $sum: '$totalChatMessages' },
          totalTokensUsed: { $sum: '$totalTokensUsed' },
        },
      },
    ]),
  ]);

  const [totalUsersCount, totalDocumentsCount, totalReviewsCount] = publicCounts;
  const siteUsage = siteUsageAgg[0] || {};

  return {
    guardrails: {
      sentbotRole:
        'Sentbot handles support, usage, dashboard totals, subscriptions, and product guidance only.',
      documentQuestions:
        'Document-content questions must be answered on the Chat page, not in Sentbot.',
    },
    user: {
      name: user.name,
      email: user.email,
      memberSince: user.createdAt || null,
      lastActiveAt: user.lastActiveAt || null,
      subscription: buildSubscriptionSummary(user),
      usage: {
        totalDocuments,
        totalChats,
        totalReviews,
        todayUploads: Number(user.dailyUsage?.uploads || 0),
        todayQueries: Number(user.dailyUsage?.queries || 0),
        todayMessages: Number(user.dailyUsage?.messages || 0),
        todayChatSessions: Number(user.dailyUsage?.chatSessions || 0),
        todayTokensUsed: Number(user.dailyUsage?.tokensUsed || 0),
        totalUploads: Number(user.documentsUploadedCount || 0),
        totalQueries: Number(user.totalQueriesAsked || 0),
        totalMessages: Number(user.totalChatMessages || 0),
        totalTokensUsed: Number(user.totalTokensUsed || 0),
      },
      recentDocuments: (recentDocuments || []).map((doc) => ({
        fileName: doc.originalFileName,
        updatedAt: doc.updatedAt || null,
      })),
      recentChats: (recentChats || []).map((chat) => ({
        title: chat.title || 'Chat',
        updatedAt: chat.updatedAt || null,
        messageCount: Number(chat.messageCount || 0),
      })),
    },
    site: {
      totals: {
        totalUsers: totalUsersCount,
        totalDocuments: totalDocumentsCount,
        totalReviews: totalReviewsCount,
      },
      usersByTier: normalizeGroupedCounts(usersByTier),
      documentsByType: normalizeGroupedCounts(documentTypes),
      usageTotals: {
        totalUploads: Number(siteUsage.totalUploads || 0),
        totalQueries: Number(siteUsage.totalQueries || 0),
        totalMessages: Number(siteUsage.totalMessages || 0),
        totalTokensUsed: Number(siteUsage.totalTokensUsed || 0),
      },
      plans: summarizePlans(),
      billing: {
        ...buildBillingCapabilities(),
        upgradePath:
          'Users can upgrade from the pricing page or account page by choosing a plan and billing interval.',
      },
      features: SUPPORT_FEATURES,
    },
  };
}

module.exports = {
  SUPPORT_FEATURES,
  buildDocumentRedirectReply,
  buildFallbackSupportAnswer,
  buildSupportContext,
  getSupportSnapshot,
  isDocumentQuestion,
};
