import { login, logout } from './login';
import { initChat } from './chat';
import { initSentBot } from './sentbot';
import { initProfileToggle } from './toggleProfile';
import { updateSettings } from './updateSettings';
// import { initSupportAssistant } from './supportAssistant';

// DOM ELEMENTS
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.getElementById('logout');
// const ditProfile = document.getElementById('ditProfile');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const yearEl = document.querySelector('.year');
const currentYear = new Date().getFullYear();
const btnNavEl = document.querySelector('.btn-mobile-nav');
const headerEl = document.querySelector('.header');
const allLinks = document.querySelectorAll('a:link');

document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initSentBot();
  initProfileToggle();
});

// DELEGATION
if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

if (logOutBtn) {
  logOutBtn.addEventListener('click', (e) => {
    e.preventDefault(); // 🛑 Stop the browser from navigating to "/logout"
    logout();
  });
}

if (userDataForm)
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    updateSettings({ name, email }, 'data');
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
// initSupportAssistant();
// console.log('hello from parcel')

yearEl.textContent = currentYear;
btnNavEl.addEventListener('click', function () {
  headerEl.classList.toggle('nav-open');
});
allLinks.forEach(function (link) {
  link.addEventListener('click', function (e) {
    const href = link.getAttribute('href');

    if (!href) return;

    // Handle in-page navigation links only
    if (href === '#') {
      // Scroll back to top
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else if (href.startsWith('#')) {
      // Scroll to other sections
      e.preventDefault();
      const sectionEl = document.querySelector(href);
      if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Close mobile navigation only for hash-based main nav links
    if (href.startsWith('#') && link.classList.contains('main-nav-link'))
      headerEl.classList.toggle('nav-open');
  });
});
function checkFlexGap() {
  var flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';

  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));

  document.body.appendChild(flex);
  var isSupported = flex.scrollHeight === 1;
  flex.parentNode.removeChild(flex);
  // console.log(isSupported);

  if (!isSupported) document.body.classList.add('no-flexbox-gap');
}
checkFlexGap();
