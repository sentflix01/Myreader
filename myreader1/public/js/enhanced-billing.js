import axios from 'axios';
import { showAlert } from './alerts';

axios.defaults.withCredentials = true;

class BillingManager {
  constructor() {
    this.isProcessing = false;
    this.userSession = null;
    this.init();
  }

  init() {
    this.consumeBillingFlash();
    this.setupEventListeners();
    this.fetchBillingState();
  }

  async fetchBillingState() {
    try {
      const response = await axios.get('/api/v1/billing/me');
      this.userSession = response.data.data;
      this.hydrateButtons();
      console.log('Billing state loaded:', this.userSession);
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.error('Failed to fetch billing state:', error);
      }
    }
  }

  consumeBillingFlash() {
    const url = new URL(window.location.href);
    const billingState = url.searchParams.get('billing');
    
    if (!billingState) return;

    const tier = url.searchParams.get('tier') || 'free';
    const interval = url.searchParams.get('interval') || 'monthly';
    
    const planLabel = this.getPlanLabel(tier, interval);
    
    switch (billingState) {
      case 'cancelled':
        showAlert('warning', `Checkout for ${planLabel} was cancelled. Your current subscription was not changed.`);
        break;
      case 'success':
        showAlert('success', `Successfully subscribed to ${planLabel}!`);
        break;
      case 'error':
        showAlert('error', 'There was an error processing your subscription. Please try again.');
        break;
    }

    // Clean up URL parameters
    url.searchParams.delete('billing');
    url.searchParams.delete('tier');
    url.searchParams.delete('interval');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }

  getPlanLabel(tier, interval = 'monthly') {
    const labels = {
      free: 'Free',
      premium: `Premium ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`,
      enterprise: `Enterprise ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`
    };
    return labels[tier] || 'Unknown Plan';
  }

  setupEventListeners() {
    // Subscription buttons
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-plan-tier]');
      if (button && !button.hasAttribute('data-billing-action')) {
        e.preventDefault();
        this.handleSubscription(button);
      }
    });

    // Cancel buttons
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-billing-action="cancel"]');
      if (button) {
        e.preventDefault();
        this.handleCancellation(button);
      }
    });

    // Listen for auth state changes
    window.addEventListener('authStateChanged', (e) => {
      if (e.detail.authenticated) {
        this.fetchBillingState();
      } else {
        this.userSession = null;
      }
    });
  }

  async handleSubscription(button) {
    if (this.isProcessing) return;

    const tier = button.getAttribute('data-plan-tier');
    const interval = button.getAttribute('data-plan-interval') || 'monthly';
    const method = button.getAttribute('data-plan-method') || (tier === 'free' ? 'direct' : 'stripe');

    if (!tier) {
      showAlert('error', 'Invalid subscription plan selected.');
      return;
    }

    // Check if user is authenticated
    if (!this.isUserAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    console.log('Processing subscription:', { tier, interval, method });

    this.setButtonState(button, 'processing');
    this.isProcessing = true;

    try {
      const response = await axios.post('/api/v1/billing/subscribe', {
        tier,
        interval,
        method
      });

      const { data } = response.data;

      if (data?.redirectUrl) {
        // Stripe checkout - preserve session
        showAlert('info', 'Redirecting to secure payment page...');
        
        // Store current state before redirect
        this.storePreCheckoutState();
        
        // Redirect to Stripe
        setTimeout(() => {
          window.location.assign(data.redirectUrl);
        }, 1000);
        return;
      }

      // Direct subscription (free plan)
      showAlert('success', response.data.message || 'Subscription updated successfully!');
      this.userSession = data;
      this.hydrateButtons();
      
      // Refresh page to update UI
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Subscription error:', error);
      
      if (error?.response?.status === 401) {
        showAlert('error', 'Your session has expired. Please log in again.');
        this.redirectToLogin();
        return;
      }

      const errorMessage = error?.response?.data?.message || 
                          error.message || 
                          'Unable to process subscription. Please try again.';
      
      showAlert('error', errorMessage);
    } finally {
      this.setButtonState(button, 'normal');
      this.isProcessing = false;
    }
  }

  async handleCancellation(button) {
    if (this.isProcessing) return;

    if (!this.isUserAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    // Confirm cancellation
    if (!confirm('Are you sure you want to cancel your subscription? You will be moved to the Free plan.')) {
      return;
    }

    this.setButtonState(button, 'processing');
    this.isProcessing = true;

    try {
      const response = await axios.post('/api/v1/billing/cancel-subscription');
      
      showAlert('success', response.data.message || 'Subscription cancelled successfully.');
      this.userSession = response.data.data;
      this.hydrateButtons();
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Cancellation error:', error);
      
      if (error?.response?.status === 401) {
        showAlert('error', 'Your session has expired. Please log in again.');
        this.redirectToLogin();
        return;
      }

      const errorMessage = error?.response?.data?.message || 
                          error.message || 
                          'Unable to cancel subscription. Please try again.';
      
      showAlert('error', errorMessage);
    } finally {
      this.setButtonState(button, 'normal');
      this.isProcessing = false;
    }
  }

  setButtonState(button, state) {
    if (!button) return;

    switch (state) {
      case 'processing':
        button.dataset.originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;
        button.style.opacity = '0.7';
        button.style.cursor = 'not-allowed';
        button.setAttribute('aria-busy', 'true');
        break;
      
      case 'normal':
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.removeAttribute('aria-busy');
        break;
    }
  }

  hydrateButtons() {
    if (!this.userSession?.subscription) return;

    const { tier: currentTier, interval: currentInterval } = this.userSession.subscription;
    
    document.querySelectorAll('[data-plan-tier]').forEach(button => {
      const tier = button.getAttribute('data-plan-tier');
      const interval = button.getAttribute('data-plan-interval') || 'monthly';
      
      // Skip cancel buttons
      if (button.getAttribute('data-billing-action') === 'cancel') return;
      
      // Mark current plan
      if (tier === currentTier && (tier === 'free' || interval === currentInterval)) {
        button.disabled = true;
        button.textContent = tier === 'free' ? 'Current Plan' : `Current ${interval}`;
        button.classList.add('btn--current');
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.disabled = false;
        button.classList.remove('btn--current');
        button.removeAttribute('aria-disabled');
      }
    });
  }

  isUserAuthenticated() {
    // Check if user data exists in DOM
    const body = document.body;
    return body.dataset.authenticated === 'true' && body.dataset.userId;
  }

  redirectToLogin() {
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`;
    
    // Store intent for after login
    sessionStorage.setItem('billing_intent', JSON.stringify({
      action: 'subscription',
      timestamp: Date.now(),
      returnUrl: currentPath
    }));
    
    window.location.assign(loginUrl);
  }

  storePreCheckoutState() {
    // Store state to restore after Stripe checkout
    sessionStorage.setItem('stripe_checkout_state', JSON.stringify({
      timestamp: Date.now(),
      returnUrl: window.location.pathname,
      userAgent: navigator.userAgent
    }));
  }

  // Handle return from Stripe checkout
  handleStripeReturn() {
    const storedState = sessionStorage.getItem('stripe_checkout_state');
    if (storedState) {
      try {
        const state = JSON.parse(storedState);
        // Verify it's recent (within 1 hour)
        if (Date.now() - state.timestamp < 3600000) {
          console.log('Returned from Stripe checkout');
          // Clear stored state
          sessionStorage.removeItem('stripe_checkout_state');
          // Refresh billing state
          this.fetchBillingState();
        }
      } catch (error) {
        console.error('Error parsing stored checkout state:', error);
      }
    }
  }

  // Handle post-login billing intent
  handlePostLoginIntent() {
    const intent = sessionStorage.getItem('billing_intent');
    if (intent) {
      try {
        const intentData = JSON.parse(intent);
        // Verify it's recent (within 10 minutes)
        if (Date.now() - intentData.timestamp < 600000) {
          console.log('Resuming billing flow after login');
          sessionStorage.removeItem('billing_intent');
          
          // Show message and refresh billing state
          showAlert('info', 'Welcome back! You can now proceed with your subscription.');
          this.fetchBillingState();
        }
      } catch (error) {
        console.error('Error parsing billing intent:', error);
      }
    }
  }
}

// Initialize billing manager
let billingManager;

export function initBilling() {
  if (typeof window === 'undefined') return;
  
  billingManager = new BillingManager();
  
  // Handle post-login intent
  if (document.readyState === 'complete') {
    billingManager.handlePostLoginIntent();
    billingManager.handleStripeReturn();
  } else {
    window.addEventListener('load', () => {
      billingManager.handlePostLoginIntent();
      billingManager.handleStripeReturn();
    });
  }
  
  // Make globally available for debugging
  window.billingManager = billingManager;
}

export function getBillingManager() {
  return billingManager;
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBilling);
  } else {
    initBilling();
  }
}