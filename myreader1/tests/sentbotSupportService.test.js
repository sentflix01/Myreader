const {\n  buildDocumentRedirectReply,\n  buildFallbackSupportAnswer,\n  isDocumentQuestion,\n} = require('../services/sentbot/supportContextService');

describe('Sentbot support guardrails', () => {
  const snapshot = {
    user: {
      subscription: {
        tier: 'premium',
        interval: 'monthly',
        status: 'active',
      },
      usage: {
        totalDocuments: 4,
        totalChats: 7,
        todayUploads: 1,
        todayQueries: 3,
        todayMessages: 5,
        totalUploads: 9,
        totalQueries: 21,
        totalMessages: 44,
      },
    },
    site: {
      totals: {
        totalUsers: 12,
        totalDocuments: 88,
        totalReviews: 19,
      },
      usageTotals: {
        totalUploads: 140,
        totalQueries: 320,
        totalMessages: 510,
      },
      billing: {
        direct: true,
        stripeConfigured: false,
      },
      features: ['Uploads', 'Chat', 'Dashboard'],
    },
  };

  test('detects document-content questions for redirect', () => {
    expect(isDocumentQuestion('What does my PDF say about refunds?')).toBe(true);
    expect(isDocumentQuestion('Summarize the uploaded document')).toBe(true);
    expect(isDocumentQuestion('How many documents have I uploaded?')).toBe(false);
  });

  test('returns support usage data for query questions', () => {
    const answer = buildFallbackSupportAnswer({
      message: 'How many queries have I asked?',
      snapshot,
    });

    expect(answer).toContain('3 queries today');
    expect(answer).toContain('21 queries in total');
  });

  test('returns support billing guidance for subscription questions', () => {
    const answer = buildFallbackSupportAnswer({
      message: 'How do I upgrade my subscription?',
      snapshot,
    });

    expect(answer).toContain('premium');
    expect(answer).toContain('pricing or account page');
  });

  test('redirect reply clearly sends document work to chat', () => {
    expect(buildDocumentRedirectReply()).toContain('Chat page');
    expect(buildDocumentRedirectReply()).toContain('document contents');
  });
});
