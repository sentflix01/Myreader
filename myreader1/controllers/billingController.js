const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  buildCheckoutSuccessHeadline,
  buildCheckoutSuccessMessage,
  getBillingPlanName,
} = require('../services/billingCopyService');
const {
  PLAN_CATALOG,
  applyPlanToUser,
  buildBillingCapabilities,
  buildPeriodEnd,
  buildSubscriptionSummary,
  cancelPlanOnUser,
  normalizeInterval,
  normalizeTier,
} = require('../services/subscriptionService');

let stripeClient;

const isMockBillingEnabled = () =>
  (process.env.STRIPE_MOCK || 'false').toLowerCase() === 'true';

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (stripeClient) return stripeClient;

  try {
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripeClient;
  } catch (err) {
    return null;
  }
};

const getBaseUrl = (req) =>
  process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;

const getPriceId = ({ tier, interval }) => {
  const normalizedTier = normalizeTier(tier);
  const normalizedInterval = normalizeInterval(interval);

  const envMap = {
    premium: {
      monthly:
        process.env.STRIPE_PRICE_PREMIUM_MONTHLY ||
        process.env.STRIPE_PRICE_PREMIUM,
      yearly:
        process.env.STRIPE_PRICE_PREMIUM_YEARLY ||
        process.env.STRIPE_PRICE_PREMIUM,
    },
    enterprise: {
      monthly:
        process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
        process.env.STRIPE_PRICE_ENTERPRISE,
      yearly:
        process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ||
        process.env.STRIPE_PRICE_ENTERPRISE,
    },
  };

  return envMap[normalizedTier]?.[normalizedInterval] || null;
};

const normalizeStripeStatus = (stripeStatus) => {
  if (!stripeStatus) return 'pending';
  if (stripeStatus === 'trialing' || stripeStatus === 'active') return 'active';
  if (stripeStatus === 'canceled') return 'cancelled';
  if (
    stripeStatus === 'incomplete' ||
    stripeStatus === 'past_due' ||
    stripeStatus === 'paused'
  ) {
    return 'pending';
  }
  if (stripeStatus === 'incomplete_expired' || stripeStatus === 'unpaid') {
    return 'expired';
  }
  return 'pending';
};

const inferTierFromPriceId = (priceId) => {
  const premiumIds = [
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    process.env.STRIPE_PRICE_PREMIUM,
  ].filter(Boolean);
  const enterpriseIds = [
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    process.env.STRIPE_PRICE_ENTERPRISE,
  ].filter(Boolean);

  if (premiumIds.includes(priceId)) return 'premium';
  if (enterpriseIds.includes(priceId)) return 'enterprise';
  return 'free';
};

const resolveCheckoutMode = ({ requestedMethod, tier, interval }) => {
  if (tier === 'free') {
    return { mode: 'direct', stripe: null, priceId: null };
  }

  const stripe = getStripeClient();
  const priceId = getPriceId({ tier, interval });
  const canUseStripe = Boolean(
    stripe && priceId && !isMockBillingEnabled() && process.env.STRIPE_SECRET_KEY,
  );

  if (requestedMethod === 'direct') {
    throw new AppError(
      'Paid subscriptions are processed through Stripe checkout only.',
      400,
    );
  }

  if (!canUseStripe) {
    throw new AppError(
      `Stripe checkout is not configured for ${getBillingPlanName({
        tier,
        interval,
      })}. Add the Stripe secret key and matching price id first.`,
      503,
    );
  }

  return { mode: 'stripe', stripe, priceId };
};

const findStripeUser = async ({ userId, customerId }) => {
  if (userId) {
    const byId = await User.findById(userId);
    if (byId) return byId;
  }

  if (customerId) {
    return User.findOne({ stripeCustomerId: customerId });
  }

  return null;
};

const applyStripeSubscriptionToUser = async (user, subscription) => {
  const price = subscription.items?.data?.[0]?.price;
  const recurringInterval =
    price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';
  const metadataTier = normalizeTier(subscription.metadata?.tier);
  const tier =
    metadataTier !== 'free' ? metadataTier : inferTierFromPriceId(price?.id);

  applyPlanToUser(user, {
    tier,
    interval: subscription.metadata?.interval || recurringInterval,
    provider: 'stripe',
    status: normalizeStripeStatus(subscription.status),
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    priceId: price?.id,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined,
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  });

  await user.save({ validateBeforeSave: false });
};

const formatDateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

exports.getBillingState = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  console.log('Getting billing state for user:', user.email);
  console.log('Current subscription:', {
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    provider: user.billingProvider
  });

  res.status(200).json({
    status: 'success',
    data: {
      subscription: buildSubscriptionSummary(user),
      plans: PLAN_CATALOG,
      capabilities: buildBillingCapabilities(),
    },
  });
});

exports.subscribe = catchAsync(async (req, res, next) => {
  const requestedTier = req.body?.tier;
  const tier = normalizeTier(requestedTier);
  const requestedMethod = req.body?.method || 'auto';
  const interval = normalizeInterval(req.body?.interval);

  console.log('Subscription request:', {
    user: req.user.email,
    requestedTier,
    tier,
    interval,
    method: requestedMethod,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID
  });

  if (!requestedTier || tier !== requestedTier) {
    return next(new AppError('Invalid tier. Use free, premium, or enterprise.', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  if (tier === 'free') {
    console.log('Downgrading user to free plan');
    cancelPlanOnUser(user);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: 'success',
      message: 'You are now on the Free plan.',
      data: {
        subscription: buildSubscriptionSummary(user),
      },
    });
  }

  const { mode, stripe, priceId } = resolveCheckoutMode({
    requestedMethod,
    tier,
    interval,
  });

  console.log('Checkout mode resolved:', { mode, priceId });

  if (mode === 'stripe') {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log('Creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save({ validateBeforeSave: false });
      console.log('Stripe customer created:', customerId);
    }

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&interval=${interval}&user=${user.id}`;
    const cancelUrl = `${baseUrl}/pricing?billing=cancelled&tier=${tier}&interval=${interval}&return=true`;
    
    console.log('Creating Stripe checkout session:', {
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      userEmail: user.email
    });
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId: user.id, tier, interval },
      },
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user.id, tier, interval },
    });

    console.log('Stripe session created:', session.id);

    return res.status(200).json({
      status: 'success',
      data: {
        redirectUrl: session.url,
        mode: 'stripe',
        sessionId: session.id,
      },
    });
  }

  // Direct/mock mode
  console.log('Using direct/mock billing mode');
  applyPlanToUser(user, {
    tier,
    interval,
    provider: 'direct',
    status: 'active',
    subscriptionId: undefined,
    priceId: undefined,
    currentPeriodEnd: buildPeriodEnd(interval),
  });
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    status: 'success',
    message: `${PLAN_CATALOG[tier].label} plan activated.`,
    data: {
      subscription: buildSubscriptionSummary(user),
      mode: 'direct',
    },
  });
});

exports.createCheckoutSession = exports.subscribe;

exports.renderCheckoutSuccess = catchAsync(async (req, res, next) => {
  const sessionId = req.query.session_id;
  const requestedTier = normalizeTier(req.query.tier);
  const requestedInterval = normalizeInterval(req.query.interval);

  if (!sessionId) {
    return next(
      new AppError(
        'Missing Stripe checkout session. Please reopen the confirmation from your billing flow.',
        400,
      ),
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  const stripe = getStripeClient();

  if (!stripe || isMockBillingEnabled()) {
    return next(
      new AppError(
        'Stripe checkout confirmation is not available until Stripe is configured.',
        503,
      ),
    );
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  const sessionCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const belongsToUser =
    String(session.metadata?.userId || session.client_reference_id || '') ===
      String(user.id) ||
    (user.stripeCustomerId && sessionCustomerId === user.stripeCustomerId);

  if (!belongsToUser) {
    return next(
      new AppError(
        'This Stripe checkout session does not belong to the current user.',
        403,
      ),
    );
  }

  let subscription = session.subscription;
  if (typeof subscription === 'string') {
    subscription = await stripe.subscriptions.retrieve(subscription);
  }

  if (subscription) {
    await applyStripeSubscriptionToUser(user, subscription);
  }

  const subscriptionSummary = buildSubscriptionSummary(user);
  const finalTier =
    subscriptionSummary.tier !== 'free'
      ? subscriptionSummary.tier
      : requestedTier;
  const finalInterval =
    subscriptionSummary.interval || normalizeInterval(requestedInterval);
  const planName = getBillingPlanName({
    tier: finalTier,
    interval: finalInterval,
  });

  return res.status(200).render('billingSuccess', {
    title: 'Subscription activated',
    planName,
    successHeadline: buildCheckoutSuccessHeadline({
      tier: finalTier,
      interval: finalInterval,
    }),
    successMessage: buildCheckoutSuccessMessage({
      tier: finalTier,
      interval: finalInterval,
    }),
    currentPeriodEndLabel: formatDateLabel(subscriptionSummary.currentPeriodEnd),
  });
});

exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  const stripe = getStripeClient();
  if (user.stripeSubscriptionId && stripe && !isMockBillingEnabled()) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      return next(
        new AppError(
          'Unable to cancel the Stripe subscription right now. Please try again.',
          502,
        ),
      );
    }
  }

  cancelPlanOnUser(user);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled and account moved to the Free plan.',
    data: {
      subscription: buildSubscriptionSummary(user),
    },
  });
});

exports.stripeWebhook = async (req, res) => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return res.status(200).json({ received: true });
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        const user = await findStripeUser({
          userId: session.metadata?.userId,
          customerId: session.customer,
        });
        if (user) await applyStripeSubscriptionToUser(user, subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object;
      const user = await findStripeUser({
        userId: subscription.metadata?.userId,
        customerId: subscription.customer,
      });
      if (user) await applyStripeSubscriptionToUser(user, subscription);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const user = await findStripeUser({
        userId: subscription.metadata?.userId,
        customerId: subscription.customer,
      });

      if (user) {
        cancelPlanOnUser(user);
        await user.save({ validateBeforeSave: false });
      }
    }
  } catch (err) {
    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ received: true });
};
