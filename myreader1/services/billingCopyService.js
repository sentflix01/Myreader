const { PLAN_CATALOG, normalizeInterval, normalizeTier } = require('./subscriptionService');

const INTERVAL_LABELS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const getBillingPlanName = ({ tier = 'free', interval = 'monthly' } = {}) => {
  const normalizedTier = normalizeTier(tier);

  if (normalizedTier === 'free') {
    return PLAN_CATALOG.free.label;
  }

  const normalizedInterval = normalizeInterval(interval);
  return `${PLAN_CATALOG[normalizedTier].label} ${INTERVAL_LABELS[normalizedInterval]}`;
};

const buildCheckoutSuccessHeadline = (options = {}) =>
  `${getBillingPlanName(options)} activated`;

const buildCheckoutSuccessMessage = ({
  tier = 'free',
  interval = 'monthly',
} = {}) => {
  const normalizedTier = normalizeTier(tier);
  const planName = getBillingPlanName({ tier: normalizedTier, interval });

  if (normalizedTier === 'enterprise') {
    return `Your ${planName} subscription is active. Your account now has enterprise usage limits, support access, and Stripe-managed billing.`;
  }

  if (normalizedTier === 'premium') {
    return `Your ${planName} subscription is active. You can now use the higher document, upload, and query limits included with this package.`;
  }

  return 'Your Free plan is active.';
};

const buildBillingCancelledMessage = ({
  tier = 'free',
  interval = 'monthly',
} = {}) => {
  const planName = getBillingPlanName({ tier, interval });
  return `Stripe checkout for ${planName} was cancelled. Your current subscription was not changed.`;
};

module.exports = {
  buildBillingCancelledMessage,
  buildCheckoutSuccessHeadline,
  buildCheckoutSuccessMessage,
  getBillingPlanName,
};
