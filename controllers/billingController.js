const Stripe = require('stripe');
const User = require('../model/userModel');
const StripeEvent = require('../model/stripeEventModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Avoid crashing the app when STRIPE_SECRET_KEY isn't set yet.
// Checkout endpoints will return a clean 503 until configured.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const tierToPriceId = (tier) => {
  if (tier === 'premium') return process.env.STRIPE_PRICE_PREMIUM;
  if (tier === 'enterprise') return process.env.STRIPE_PRICE_ENTERPRISE;
  return null;
};

const normalizeSubscriptionStatus = (stripeStatus) => {
  // Stripe subscription statuses:
  // incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused
  if (!stripeStatus) return 'pending';
  if (stripeStatus === 'trialing' || stripeStatus === 'active') return 'active';
  if (stripeStatus === 'canceled') return 'cancelled';
  if (stripeStatus === 'incomplete' || stripeStatus === 'past_due')
    return 'pending';
  if (stripeStatus === 'incomplete_expired' || stripeStatus === 'unpaid')
    return 'expired';
  if (stripeStatus === 'paused') return 'pending';
  return 'pending';
};

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const { tier } = req.body || {};
  const priceId = tierToPriceId(tier);

  if (!tier || !priceId) {
    return next(new AppError('Invalid tier. Use premium or enterprise.', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new AppError('Stripe is not configured (missing key).', 503));
  }

  const successUrl =
    process.env.STRIPE_SUCCESS_URL ||
    `${req.protocol}://${req.get('host')}/dashboard?success=1`;
  const cancelUrl =
    process.env.STRIPE_CANCEL_URL ||
    `${req.protocol}://${req.get('host')}/pricing?canceled=1`;

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save({ validateBeforeSave: false });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId: user.id, tier },
    },
    client_reference_id: user.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: user.id, tier },
  });

  res.status(200).json({
    status: 'success',
    data: { url: session.url },
  });
});

exports.createBillingPortalSession = catchAsync(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new AppError('Stripe is not configured (missing key).', 503));
  }

  const user = await User.findById(req.user.id);
  if (!user || !user.stripeCustomerId) {
    return next(new AppError('No Stripe customer found for user.', 404));
  }

  const returnUrl = req.body.returnUrl || `${req.protocol}://${req.get('host')}/account`;

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  res.status(200).json({ status: 'success', data: { url: session.url } });
});

exports.cancelSubscription = catchAsync(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return next(new AppError('Stripe is not configured (missing key).', 503));
  }

  const { immediately } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user || !user.stripeSubscriptionId) {
    return next(new AppError('No active subscription found for user.', 404));
  }

  if (immediately) {
    await stripe.subscriptions.del(user.stripeSubscriptionId);
  } else {
    // cancel at period end
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Update local user record optimistically; actual webhook will provide final state
  user.subscriptionStatus = 'cancelled';
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { message: 'Subscription cancellation requested.' } });
});

exports.getMySubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json({ status: 'success', data: { subscription: {
    tier: user.subscriptionTier || 'free',
    status: user.subscriptionStatus || 'free',
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    currentPeriodEnd: user.currentPeriodEnd,
    trialEndsAt: user.trialEndsAt,
  } } });
});

exports.stripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    // Webhook secret not configured — reject to avoid processing unsigned events
    return res.status(503).send('Stripe webhook secret not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: ignore duplicate events we've already processed
  try {
    const existing = await StripeEvent.findOne({ eventId: event.id });
    if (existing) {
      return res.status(200).json({ received: true, note: 'already processed' });
    }
    await StripeEvent.create({ eventId: event.id, type: event.type, payload: event });
  } catch (err) {
    // If DB check fails, continue processing to avoid missing critical updates
    // but log
    console.error('StripeEvent lookup/create error', err);
  }

  const upsertFromSubscription = async (subscription) => {
    const customerId = subscription.customer;
    const userId = subscription.metadata?.userId;
    const tier = subscription.metadata?.tier;
    const priceId = subscription.items?.data?.[0]?.price?.id;

    const update = {
      subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
    };

    if (tier === 'premium' || tier === 'enterprise') {
      update.subscriptionTier = tier;
    }

    if (userId) {
      await User.findByIdAndUpdate(userId, update, { new: false });
      return;
    }

    if (customerId) {
      await User.findOneAndUpdate({ stripeCustomerId: customerId }, update, {
        new: false,
      });
    }
  };

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        // If the API key isn't configured, we can't retrieve the subscription.
        // We'll rely on customer.subscription.* webhook events instead.
        if (process.env.STRIPE_SECRET_KEY) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          await upsertFromSubscription(subscription);
        }
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      await upsertFromSubscription(event.data.object);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const userId = subscription.metadata?.userId;
      const update = {
        subscriptionTier: 'free',
        subscriptionStatus: 'cancelled',
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        currentPeriodEnd: undefined,
        trialEndsAt: undefined,
      };

      if (userId) {
        await User.findByIdAndUpdate(userId, update, { new: false });
      } else if (customerId) {
        await User.findOneAndUpdate({ stripeCustomerId: customerId }, update, {
          new: false,
        });
      }
    }
  } catch (err) {
    return res.status(500).json({ received: true });
  }

  return res.status(200).json({ received: true });
};

