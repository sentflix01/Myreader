const {\n  buildBillingCancelledMessage,\n  buildCheckoutSuccessHeadline,\n  buildCheckoutSuccessMessage,\n  getBillingPlanName,\n} = require('../services/billingCopyService');

describe('BillingCopyService', () => {
  test('builds plan labels for paid intervals', () => {
    expect(getBillingPlanName({ tier: 'premium', interval: 'yearly' })).toBe(
      'Premium Yearly',
    );
    expect(getBillingPlanName({ tier: 'enterprise', interval: 'monthly' })).toBe(
      'Enterprise Monthly',
    );
  });

  test('builds package-specific success copy', () => {
    expect(
      buildCheckoutSuccessHeadline({ tier: 'premium', interval: 'monthly' }),
    ).toBe('Premium Monthly activated');

    expect(
      buildCheckoutSuccessMessage({ tier: 'enterprise', interval: 'monthly' }),
    ).toContain('enterprise usage limits');
  });

  test('builds cancellation copy with package name', () => {
    expect(
      buildBillingCancelledMessage({ tier: 'premium', interval: 'yearly' }),
    ).toContain('Premium Yearly');
  });
});
