import axios from 'axios';
import { showAlert } from './alerts';
import { ct } from './i18n';

const billingApi = axios.create({ withCredentials: true });

function setButtonBusy(btn, busy, busyLabel = 'Working...') {
  if (!btn) return;

  if (busy) {
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = busyLabel;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    return;
  }

  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
}

export function initBilling() {
  const buttons = document.querySelectorAll('[data-plan-tier]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const tier = btn.getAttribute('data-plan-tier');
      if (!tier) return;

      try {
        setButtonBusy(btn, true, ct('billing.redirecting', {}, 'Redirecting...'));
        const res = await billingApi.post('/api/v1/billing/create-checkout-session', {
          tier,
        });
        const url = res?.data?.data?.url;
        if (!url) {
          throw new Error(ct('billing.noCheckoutUrl', {}, 'No checkout URL returned'));
        }
        window.location.assign(url);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          showAlert(
            'error',
            ct('billing.loginToUpgrade', {}, 'Please log in to upgrade your plan.'),
          );
          window.setTimeout(() => window.location.assign('/login'), 1200);
          return;
        }
        showAlert(
          'error',
          err?.response?.data?.message ||
            err.message ||
            ct('billing.checkoutFail', {}, 'Unable to start checkout'),
        );
      } finally {
        setButtonBusy(btn, false);
      }
    });
  });

  const portalButtons = document.querySelectorAll('[data-open-billing-portal]');
  portalButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      try {
        setButtonBusy(btn, true, ct('billing.opening', {}, 'Opening...'));
        const res = await billingApi.post('/api/v1/billing/create-portal-session', {
          returnUrl: btn.dataset.returnUrl || window.location.href,
        });
        const url = res?.data?.data?.url;
        if (!url) {
          throw new Error(ct('billing.noPortalUrl', {}, 'No billing portal URL returned'));
        }
        window.location.assign(url);
      } catch (err) {
        showAlert(
          'error',
          err?.response?.data?.message ||
            err.message ||
            ct('billing.portalFail', {}, 'Unable to open billing portal'),
        );
      } finally {
        setButtonBusy(btn, false);
      }
    });
  });

  const cancelButtons = document.querySelectorAll('[data-cancel-subscription]');
  cancelButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      const immediately = btn.dataset.cancelMode === 'immediately';
      const confirmed = window.confirm(
        immediately
          ? ct('billing.cancelNow', {}, 'Cancel the subscription immediately?')
          : ct(
              'billing.cancelEnd',
              {},
              'Cancel the subscription at the end of the current billing period?',
            ),
      );
      if (!confirmed) return;

      try {
        setButtonBusy(btn, true, ct('billing.updating', {}, 'Updating...'));
        const res = await billingApi.post('/api/v1/billing/cancel-subscription', {
          immediately,
        });
        showAlert(
          'success',
          res?.data?.data?.message ||
            ct('billing.subUpdated', {}, 'Subscription updated successfully.'),
        );
        window.setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        showAlert(
          'error',
          err?.response?.data?.message ||
            err.message ||
            ct('billing.subUpdateFail', {}, 'Unable to update subscription'),
        );
      } finally {
        setButtonBusy(btn, false);
      }
    });
  });
}
