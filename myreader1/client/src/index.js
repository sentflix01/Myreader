import { initPreferences } from './features/preferences/preferences.page';
import { initTour } from './features/tour/tour.page';
import { initChat } from './features/chat/chat.page';

import { initBilling } from '../../public/js/billing';
import { initSentBot } from '../../public/js/sentbot';
import { initProfileToggle } from '../../public/js/toggleProfile';
import { initAccountTabs } from '../../public/js/accountTabs';
import { login, logout } from '../../public/js/login';
import { signup } from '../../public/js/signup';
import { updateSettings } from '../../public/js/updateSettings';

function safeInit(label, initFn) {
  try {
    initFn?.();
  } catch (error) {
    console.error(`${label} init failed`, error);
  }
}

function setFormStatus(form, { type = '', message = '' } = {}) {
  const statusEl = form?.querySelector?.('[data-auth-status]');
  if (!statusEl) return;

  statusEl.textContent = message || '';
  statusEl.classList.remove(
    'form__status--pending',
    'form__status--success',
    'form__status--error',
  );

  if (type) {
    statusEl.classList.add(`form__status--${type}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Year
  const yearEl = document.querySelector('.year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Mobile navigation ──────────────────────────────────────
  const btnNavEl = document.querySelector('.btn-mobile-nav');
  const headerEl = document.querySelector('.header');
  const mainNav = document.querySelector('.main-nav');

  function isNavOpen() {
    return headerEl?.classList.contains('nav-open') ?? false;
  }

  function closeNav() {
    headerEl?.classList.remove('nav-open');
    document.body.classList.remove('nav-is-open');
  }

  function openNav() {
    headerEl?.classList.add('nav-open');
    document.body.classList.add('nav-is-open');
  }

  if (btnNavEl) {
    btnNavEl.addEventListener('click', (e) => {
      e.stopPropagation();
      isNavOpen() ? closeNav() : openNav();
    });
  }

  // Close nav when any nav link is clicked
  document.querySelectorAll('.main-nav-link, .action-item').forEach((el) => {
    el.addEventListener('click', closeNav);
  });

  // Close nav on outside click (but not on the hamburger itself)
  document.addEventListener('click', (e) => {
    if (!isNavOpen()) return;
    if (btnNavEl?.contains(e.target)) return;
    if (mainNav?.contains(e.target)) return;
    closeNav();
  });

  // Close nav on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  // Smooth scroll for hash links
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      closeNav();
    });
  });

  // ── Auth wiring ────────────────────────────────────────────
  const loginForm = document.querySelector('.form--login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('email')?.value;
      const password = document.getElementById('password')?.value;
      const nextPath = document.getElementById('next')?.value || undefined;

      if (submitButton) {
        submitButton.dataset.originalText =
          submitButton.dataset.originalText || submitButton.textContent;
        submitButton.textContent = 'Logging in...';
        submitButton.disabled = true;
      }

      setFormStatus(loginForm, {
        type: 'pending',
        message: 'Checking your account details...',
      });

      try {
        await login(email, password, nextPath);
        setFormStatus(loginForm, {
          type: 'success',
          message: 'Login successful. Redirecting...',
        });
      } catch (error) {
        setFormStatus(loginForm, {
          type: 'error',
          message: error.message || 'Login failed.',
        });
      } finally {
        if (submitButton) {
          submitButton.textContent =
            submitButton.dataset.originalText || submitButton.textContent;
          submitButton.disabled = false;
        }
      }
    });
  }

  const signupForm = document.querySelector('.form--signup');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name')?.value;
      const email = document.getElementById('email')?.value;
      const password = document.getElementById('password')?.value;
      const passwordConfirm = document.getElementById('passwordConfirm')?.value;
      const button = signupForm.querySelector('button[type="submit"]');
      const nextPath = document.getElementById('next')?.value || undefined;
      signup(name, email, password, passwordConfirm, button, nextPath);
    });
  }

  safeInit('preferences', initPreferences);
  safeInit('profile toggle', initProfileToggle);
  safeInit('account tabs', initAccountTabs);
  safeInit('chat', initChat);
  safeInit('sentbot', initSentBot);
  safeInit('billing', initBilling);
  safeInit('tour', initTour);

  const logOutBtn = document.getElementById('logout');
  if (logOutBtn) {
    logOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  const userDataForm = document.querySelector('.form-user-data');
  if (userDataForm) {
    userDataForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name')?.value;
      const email = document.getElementById('email')?.value;
      const photoInput = document.getElementById('photo');
      const form = new FormData();
      form.append('name', name);
      form.append('email', email);
      if (photoInput?.files?.[0]) form.append('photo', photoInput.files[0]);
      updateSettings(form, 'data');
    });
  }

  const userPasswordForm = document.querySelector('.form-user-password');
  if (userPasswordForm) {
    userPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.querySelector('.btn--save-password');
      if (btn) btn.textContent = 'Updating...';
      const passwordCurrent = document.getElementById('password-current')?.value;
      const password = document.getElementById('password')?.value;
      const passwordConfirm = document.getElementById('password-confirm')?.value;
      await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');
      if (btn) btn.textContent = 'Save password';
      ['password-current', 'password', 'password-confirm'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    });
  }

  // ── Flexbox gap check ──────────────────────────────────────
  (function checkFlexGap() {
    const flex = document.createElement('div');
    flex.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    document.body.appendChild(flex);
    if (flex.scrollHeight !== 1) document.body.classList.add('no-flexbox-gap');
    document.body.removeChild(flex);
  })();
});
