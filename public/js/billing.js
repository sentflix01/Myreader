import axios from 'axios';
import { showAlert } from './alerts';

export function initBilling() {
  const buttons = document.querySelectorAll('[data-plan-tier]');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const tier = btn.getAttribute('data-plan-tier');
      if (!tier) return;

      try {
        btn.setAttribute('aria-busy', 'true');
        const res = await axios.post('/api/v1/billing/create-checkout-session', {
          tier,
        });
        const url = res?.data?.data?.url;
        if (!url) throw new Error('No checkout URL returned');
        window.location.assign(url);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          showAlert('error', 'Please log in to upgrade your plan.');
          window.setTimeout(() => window.location.assign('/login'), 1200);
          return;
        }
        showAlert(
          'error',
          err?.response?.data?.message || err.message || 'Unable to start checkout',
        );
      } finally {
        btn.removeAttribute('aria-busy');
      }
    });
  });
}

