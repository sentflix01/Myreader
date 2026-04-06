import { showAlert } from '../auth/alerts.view';
import {
  cancelSubscription,
  fetchMySubscription,
  subscribePlan,
} from './billing.model';

function markBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = 'Working...';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function redirectToLogin() {
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
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

async function handleSubscribe(button) {
  const tier = button.getAttribute('data-plan-tier');
  const interval = button.getAttribute('data-plan-interval') || 'monthly';
  const method = button.getAttribute('data-plan-method') || 'auto';
  if (!tier) return;

  markBusy(button, true);
  try {
    const data = await subscribePlan({ tier, interval, method });
    const redirectUrl = data?.data?.redirectUrl;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
      return;
    }
    showAlert('success', data?.message || 'Subscription updated.');
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    if (err?.response?.status === 401) {
      redirectToLogin();
      return;
    }
    showAlert(
      'error',
      err?.response?.data?.message || err.message || 'Unable to update subscription.',
    );
  } finally {
    markBusy(button, false);
  }
}

async function handleCancel(button) {
  markBusy(button, true);
  try {
    const data = await cancelSubscription();
    showAlert('success', data?.message || 'Subscription cancelled.');
    window.setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    if (err?.response?.status === 401) {
      redirectToLogin();
      return;
    }
    showAlert(
      'error',
      err?.response?.data?.message || err.message || 'Unable to cancel subscription.',
    );
  } finally {
    markBusy(button, false);
  }
}

export function initBillingController() {
  const buttons = Array.from(document.querySelectorAll('[data-plan-tier]'));
  const cancelButtons = Array.from(
    document.querySelectorAll('[data-billing-action=\"cancel\"]'),
  );

  if (!buttons.length && !cancelButtons.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      handleSubscribe(button);
    });
  });

  cancelButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      handleCancel(button);
    });
  });

  fetchMySubscription()
    .then((sub) => hydrateCurrentPlan(buttons, sub))
    .catch((err) => {
      if (err?.response?.status !== 401) {
        // ignore
      }
    });
}

