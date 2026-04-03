const subscriptionService = require('../services/subscriptionService');

describe('SubscriptionService', () => {
  const createUser = (overrides = {}) => ({
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    dailyUsage: {
      windowStartedAt: new Date(),
      uploads: 0,
      queries: 0,
      messages: 0,
      chatSessions: 0,
      tokensUsed: 0,
    },
    save: jest.fn(),
    markModified: jest.fn(),
    ...overrides,
  });

  test('should have free plan with correct limits', () => {
    const freePlan = subscriptionService.PLAN_CATALOG.free;
    expect(freePlan.limits.maxDocuments).toBe(5);
    expect(freePlan.limits.maxDailyQueries).toBe(5);
  });

  test('should have premium plan with correct limits', () => {
    const premiumPlan = subscriptionService.PLAN_CATALOG.premium;
    expect(premiumPlan.limits.maxDocuments).toBe(50);
    expect(premiumPlan.limits.maxDailyQueries).toBe(250);
  });

  test('should block folder uploads for non-enterprise users', async () => {
    const user = createUser({ subscriptionTier: 'free' });

    await expect(
      subscriptionService.ensureCanUploadFolder(user, {
        files: [{ name: 'contract.pdf', size: 1024 }],
      }),
    ).rejects.toThrow('Folder uploads are available only on the Enterprise plan.');
  });

  test('should allow folder uploads for enterprise users', async () => {
    const user = createUser({ subscriptionTier: 'enterprise' });

    await expect(
      subscriptionService.ensureCanUploadFolder(user, {
        files: [
          { name: 'folder/doc-a.pdf', size: 1024 },
          { name: 'folder/doc-b.pdf', size: 2048 },
        ],
      }),
    ).resolves.toMatchObject({ fileCount: 2 });
  });
});
