import { initChat } from './chat';
import { initBilling } from './enhanced-billing';
import { initSentBot } from './sentbot';
import { initProfileToggle } from './toggleProfile';
import { initAccountTabs } from './accountTabs';
import { initTheme } from './theme-manager';
import { initLanguage } from './language-manager';
import { initMobileOptimizer } from './mobile-optimizer';
import { login, logout } from './login';
import { signup } from './signup';
import { updateSettings } from './updateSettings';

// Import mobile enhancements
import './mobile-performance.js';
import './touch-gestures.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize core systems first
    initTheme();
    initLanguage();
    initMobileOptimizer();
    
    // Initialize UI components
    initProfileToggle();
    initAccountTabs();

    // Initialize features
    initChat();
    initSentBot();
    initBilling();
    
    console.log('All systems initialized successfully');
  } catch (error) {
    console.error('Error initializing features:', error);
  }

  // Site shell helpers
  const yearEl = document.querySelector('.year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const btnNavEl = document.querySelector('.btn-mobile-nav');
  const headerEl = document.querySelector('.header');
  if (btnNavEl && headerEl) {
    btnNavEl.addEventListener('click', () => {
      try {
        headerEl.classList.toggle('nav-open');
      } catch (error) {
        console.error('Error toggling navigation:', error);
      }
    });
  }

  const allLinks = document.querySelectorAll('a:link');
  allLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href) return;

      if (href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (href.startsWith('#')) {
        e.preventDefault();
        const sectionEl = document.querySelector(href);
        if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
      }

      if (href.startsWith('#') && link.classList.contains('main-nav-link')) {
        headerEl?.classList.toggle('nav-open');
      }
    });
  });

  // Auth + user settings wiring (Jonas-style)
  const loginForm = document.querySelector('.form--login');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById('email')?.value?.trim();
        const password = document.getElementById('password')?.value;
        
        if (!email || !password) {
          alert('Please enter both email and password');
          return;
        }
        
        if (!isValidEmail(email)) {
          alert('Please enter a valid email address');
          return;
        }
        
        const nextInput = document.getElementById('next');
        const nextPath = nextInput && nextInput.value ? nextInput.value : undefined;
        login(email, password, nextPath);
      } catch (error) {
        console.error('Login form error:', error);
        alert('An error occurred during login. Please try again.');
      }
    });
  }

  const signupForm = document.querySelector('.form--signup');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('name')?.value?.trim();
        const email = document.getElementById('email')?.value?.trim();
        const password = document.getElementById('password')?.value;
        const passwordConfirm = document.getElementById('passwordConfirm')?.value;
        
        if (!name || !email || !password || !passwordConfirm) {
          alert('Please fill in all fields');
          return;
        }
        
        if (!isValidEmail(email)) {
          alert('Please enter a valid email address');
          return;
        }
        
        if (password.length < 8) {
          alert('Password must be at least 8 characters long');
          return;
        }
        
        if (password !== passwordConfirm) {
          alert('Passwords do not match');
          return;
        }
        
        const button = signupForm.querySelector('button[type="submit"]');
        const nextInput = document.getElementById('next');
        const nextPath = nextInput && nextInput.value ? nextInput.value : undefined;
        signup(name, email, password, passwordConfirm, button, nextPath);
      } catch (error) {
        console.error('Signup form error:', error);
        alert('An error occurred during signup. Please try again.');
      }
    });
  }

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
      const currentEl = document.getElementById('password-current');
      const passEl = document.getElementById('password');
      const confirmEl = document.getElementById('password-confirm');
      if (currentEl) currentEl.value = '';
      if (passEl) passEl.value = '';
      if (confirmEl) confirmEl.value = '';
    });
  }

  // Flex-gap check
  (function checkFlexGap() {
    try {
      const flex = document.createElement('div');
      flex.style.display = 'flex';
      flex.style.flexDirection = 'column';
      flex.style.rowGap = '1px';
      flex.appendChild(document.createElement('div'));
      flex.appendChild(document.createElement('div'));
      document.body.appendChild(flex);
      const isSupported = flex.scrollHeight === 1;
      flex.parentNode.removeChild(flex);
      if (!isSupported) document.body.classList.add('no-flexbox-gap');
    } catch (error) {
      console.error('Flexbox gap check failed:', error);
    }
  })();
});

// Utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
