import axios from 'axios';
import { showAlert } from './alerts';

axios.defaults.withCredentials = true;

function getPlanLabel(tier, interval = 'monthly') {
  if (tier === 'premium') {
    return `Premium ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`;
  }

  if (tier === 'enterprise') {
    return `Enterprise ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`;
  }

  return 'Free';
}

function consumeBillingFlash() {
  const url = new URL(window.location.href);
  const billingState = url.searchParams.get('billing');

  if (!billingState) return;

  const tier = url.searchParams.get('tier') || 'free';
  const interval = url.searchParams.get('interval') || 'monthly';

  console.log('Processing billing flash message:', { billingState, tier, interval });

  if (billingState === 'cancelled') {
    showAlert(
      'warning',
      `Checkout for ${getPlanLabel(
        tier,
        interval,
      )} was cancelled. Your current subscription was not changed.`,
    );
  } else if (billingState === 'success') {
    showAlert(
      'success',
      `Successfully subscribed to ${getPlanLabel(tier, interval)}!`,
    );
  } else if (billingState === 'error') {
    showAlert(
      'error',
      'There was an error processing your subscription. Please try again.',
    );
  }

  // Clean up URL parameters
  url.searchParams.delete('billing');
  url.searchParams.delete('tier');
  url.searchParams.delete('interval');
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

function markBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = 'Processing...';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?next=${next}`);
}

function hydrateCurrentPlan(buttons, subscription) {
  const currentTier = subscription?.tier;
  const currentInterval = subscription?.interval;

  buttons.forEach((button) => {
    const tier = button.getAttribute('data-plan-tier');
    const interval = button.getAttribute('data-plan-interval') || 'monthly';

    if (button.getAttribute('data-billing-action') === 'cancel') return;

    if (tier === currentTier && (tier === 'free' || interval === currentInterval)) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = tier === 'free' ? 'Current plan' : `Current ${interval}`;
    }
  });
}

async function subscribe(button) {
  const tier = button.getAttribute('data-plan-tier');
  const interval = button.getAttribute('data-plan-interval') || 'monthly';
  const method =
    button.getAttribute('data-plan-method') || (tier === 'free' ? 'direct' : 'stripe');

  if (!tier) {
    showAlert('error', 'Invalid subscription plan selected.');
    return;
  }

  console.log('Starting subscription process:', { tier, interval, method });

  markBusy(button, true);
  try {
    const res = await axios.post('/api/v1/billing/subscribe', {
      tier,
      interval,
      method,
    });

    console.log('Subscription response:', res.data);

    const redirectUrl = res?.data?.data?.redirectUrl;
    if (redirectUrl) {
      console.log('Redirecting to Stripe checkout:', redirectUrl);
      showAlert('info', 'Redirecting to secure payment page...');
      
      // Small delay to show the message
      setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 1000);
      return;
    }

    // Direct subscription (free or mock mode)
    showAlert('success', res?.data?.message || 'Subscription updated successfully!');
    console.log('Direct subscription successful, reloading page...');
    window.setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    console.error('Subscription error:', err);
    
    if (err?.response?.status === 401) {
      showAlert('error', 'Please log in to continue.');
      redirectToLogin();
      return;
    }

    const errorMessage = err?.response?.data?.message ||
      err.message ||
      'Unable to process subscription. Please try again.';
    
    showAlert('error', errorMessage);
  } finally {
    markBusy(button, false);
  }
}

async function cancelSubscription(button) {
  markBusy(button, true);
  try {
    const res = await axios.post('/api/v1/billing/cancel-subscription');
    showAlert('success', res?.data?.message || 'Subscription cancelled.');
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    if (err?.response?.status === 401) {
      redirectToLogin();
      return;
    }

    showAlert(
      'error',
      err?.response?.data?.message ||
        err.message ||
        'Unable to cancel subscription.',
    );
  } finally {
    markBusy(button, false);
  }
}

export function initBilling() {
  const buttons = Array.from(document.querySelectorAll('[data-plan-tier]'));
  const cancelButtons = Array.from(
    document.querySelectorAll('[data-billing-action="cancel"]'),
  );

  if (!buttons.length && !cancelButtons.length) return;

  console.log('Initializing billing system with', buttons.length, 'subscription buttons');

  consumeBillingFlash();

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('Subscription button clicked:', {
        tier: button.getAttribute('data-plan-tier'),
        interval: button.getAttribute('data-plan-interval'),
        method: button.getAttribute('data-plan-method')
      });
      subscribe(button);
    });
  });

  cancelButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      cancelSubscription(button);
    });
  });

  // Get billing state and hydrate buttons
  console.log('Fetching billing state...');
  axios
    .get('/api/v1/billing/me')
    .then((res) => {
      console.log('Billing state received:', res.data);
      hydrateCurrentPlan(buttons, res?.data?.data?.subscription);
    })
    .catch((err) => {
      console.error('Failed to fetch billing state:', err);
      if (err?.response?.status === 401) {
        console.log('User not authenticated for billing');
        // Don't redirect here, just log the issue
      }
    });
}
