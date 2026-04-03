import { t } from '../preferences/preferences.page';

const TOUR_STORAGE_PREFIX = 'myreader_tour_seen';
const LEGACY_TOUR_STORAGE_PREFIX = 'sentreader_tour_seen';
const AUTO_OPEN_PAGES = new Set([
  'overview',
  'login',
  'signup',
  'dashboard',
  'chat',
  'pricing',
  'services',
  'features',
  'account',
]);

function getPageKey() {
  const path = window.location.pathname;
  if (path === '/') return 'overview';
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path === '/dashboard') return 'dashboard';
  if (path === '/chat') return 'chat';
  if (path === '/pricing') return 'pricing';
  if (path === '/services') return 'services';
  if (path === '/features') return 'features';
  if (path === '/editprofile' || path === '/editProfile') return 'account';
  return 'generic';
}

function getStorageKey(prefix = TOUR_STORAGE_PREFIX) {
  const authScope =
    document.body?.dataset.authenticated === 'true' ? 'private' : 'public';
  return `${prefix}:${authScope}:${getPageKey()}`;
}

function hasSeenTour() {
  try {
    return (
      localStorage.getItem(getStorageKey()) === 'true' ||
      localStorage.getItem(getStorageKey(LEGACY_TOUR_STORAGE_PREFIX)) ===
        'true'
    );
  } catch (_err) {
    return false;
  }
}

function getTourDefinitions() {
  const pageKey = getPageKey();

  const commonControls = {
    selector: '#tourPreferences',
    titleKey: 'tour.common.controls.title',
    descriptionKey: 'tour.common.controls.description',
  };

  const pageDefinitions = {
    overview: [
      commonControls,
      {
        selector: '.section-hero',
        titleKey: 'tour.overview.hero.title',
        descriptionKey: 'tour.overview.hero.description',
      },
      {
        selector: '#features',
        titleKey: 'tour.overview.how.title',
        descriptionKey: 'tour.overview.how.description',
      },
      {
        selector: '#pricing',
        titleKey: 'tour.overview.pricing.title',
        descriptionKey: 'tour.overview.pricing.description',
      },
      {
        selector: '#cta',
        titleKey: 'tour.overview.cta.title',
        descriptionKey: 'tour.overview.cta.description',
      },
    ],
    login: [
      commonControls,
      {
        selector: '.form--login',
        titleKey: 'tour.login.form.title',
        descriptionKey: 'tour.login.form.description',
      },
      {
        selector: '.login-form p',
        titleKey: 'tour.login.alt.title',
        descriptionKey: 'tour.login.alt.description',
      },
    ],
    signup: [
      commonControls,
      {
        selector: '.form--signup',
        titleKey: 'tour.signup.form.title',
        descriptionKey: 'tour.signup.form.description',
      },
      {
        selector: '.login-form p',
        titleKey: 'tour.signup.alt.title',
        descriptionKey: 'tour.signup.alt.description',
      },
    ],
    dashboard: [
      commonControls,
      {
        selector: '.dashboard-summary',
        titleKey: 'tour.dashboard.summary.title',
        descriptionKey: 'tour.dashboard.summary.description',
      },
      {
        selector: '.section-dashboard-list',
        titleKey: 'tour.dashboard.reviews.title',
        descriptionKey: 'tour.dashboard.reviews.description',
      },
      {
        selector: '.section-dashboard-list + .section-dashboard-list',
        titleKey: 'tour.dashboard.chats.title',
        descriptionKey: 'tour.dashboard.chats.description',
      },
    ],
    pricing: [
      commonControls,
      {
        selector: '#pricing',
        titleKey: 'tour.pricing.plans.title',
        descriptionKey: 'tour.pricing.plans.description',
      },
      {
        selector: '.pricing-plan--complete-free',
        titleKey: 'tour.pricing.free.title',
        descriptionKey: 'tour.pricing.free.description',
      },
      {
        selector: '.pricing-plan--complete-starter',
        titleKey: 'tour.pricing.starter.title',
        descriptionKey: 'tour.pricing.starter.description',
      },
      {
        selector: '.pricing-plan--complete-enterprise',
        titleKey: 'tour.pricing.enterprise.title',
        descriptionKey: 'tour.pricing.enterprise.description',
      },
      {
        selector: '#contacts',
        titleKey: 'tour.pricing.features.title',
        descriptionKey: 'tour.pricing.features.description',
      },
    ],
    services: [
      commonControls,
      {
        selector: '#services',
        titleKey: 'tour.services.docs.title',
        descriptionKey: 'tour.services.docs.description',
      },
      {
        selector: '.diets',
        titleKey: 'tour.services.formats.title',
        descriptionKey: 'tour.services.formats.description',
      },
      {
        selector: '#dashboard',
        titleKey: 'tour.services.reviews.title',
        descriptionKey: 'tour.services.reviews.description',
      },
      {
        selector: '.gallery',
        titleKey: 'tour.services.gallery.title',
        descriptionKey: 'tour.services.gallery.description',
      },
    ],
    features: [
      commonControls,
      {
        selector: '#features',
        titleKey: 'tour.features.intro.title',
        descriptionKey: 'tour.features.intro.description',
      },
      {
        selector: '.step-text-box',
        titleKey: 'tour.features.step1.title',
        descriptionKey: 'tour.features.step1.description',
      },
      {
        selector: '.step-img-box',
        titleKey: 'tour.features.step2.title',
        descriptionKey: 'tour.features.step2.description',
      },
    ],
    account: [
      commonControls,
      {
        selector: '.user-view__menu',
        titleKey: 'tour.account.nav.title',
        descriptionKey: 'tour.account.nav.description',
      },
      {
        selector: '.form-user-data',
        titleKey: 'tour.account.profile.title',
        descriptionKey: 'tour.account.profile.description',
      },
      {
        selector: '.form-user-password',
        titleKey: 'tour.account.password.title',
        descriptionKey: 'tour.account.password.description',
      },
      {
        selector: '[data-section-content="subscription"]',
        titleKey: 'tour.account.subscription.title',
        descriptionKey: 'tour.account.subscription.description',
      },
    ],
    chat: [
      commonControls,
      {
        selector: '#leftSidebar',
        titleKey: 'tour.chat.sidebar.title',
        descriptionKey: 'tour.chat.sidebar.description',
      },
      {
        selector: '#chatUploadArea, .chat-welcome-state',
        titleKey: 'tour.chat.upload.title',
        descriptionKey: 'tour.chat.upload.description',
      },
      {
        selector: '#chatInputContainer',
        titleKey: 'tour.chat.composer.title',
        descriptionKey: 'tour.chat.composer.description',
      },
      {
        selector: '#rightSidebar',
        titleKey: 'tour.chat.history.title',
        descriptionKey: 'tour.chat.history.description',
      },
      {
        selector: '#chatbot-toggler',
        titleKey: 'tour.chat.sentbot.title',
        descriptionKey: 'tour.chat.sentbot.description',
      },
    ],
  };

  return (pageDefinitions[pageKey] || [commonControls]).filter((step) => {
    // support comma-separated selectors (try each one)
    const selectors = step.selector.split(',').map((s) => s.trim());
    return selectors.some((sel) => {
      try { return Boolean(document.querySelector(sel)); }
      catch (_) { return false; }
    });
  }).map((step) => ({
    ...step,
    // resolve first matching selector
    selector: step.selector.split(',').map((s) => s.trim()).find((sel) => {
      try { return Boolean(document.querySelector(sel)); }
      catch (_) { return false; }
    }) || step.selector,
  }));
}

function createTourRoot() {
  const existing = document.getElementById('appTourRoot');
  if (existing) return existing;

  const root = document.createElement('div');
  root.id = 'appTourRoot';
  root.className = 'app-tour';
  root.hidden = true;
  root.innerHTML = `
    <div class="app-tour__backdrop"></div>
    <div class="app-tour__spotlight" id="appTourSpotlight"></div>
    <div class="app-tour__card" role="dialog" aria-modal="true" aria-labelledby="appTourTitle">
      <div class="app-tour__meta">
        <span class="app-tour__progress" id="appTourProgress"></span>
        <button class="app-tour__close" id="appTourClose" type="button" aria-label="Close tour">&times;</button>
      </div>
      <h3 class="app-tour__title" id="appTourTitle"></h3>
      <p class="app-tour__description" id="appTourDescription"></p>
      <div class="app-tour__actions">
        <button class="app-tour__button app-tour__button--ghost" id="appTourSkip" type="button"></button>
        <div class="app-tour__spacer"></div>
        <button class="app-tour__button app-tour__button--ghost" id="appTourPrev" type="button"></button>
        <button class="app-tour__button app-tour__button--primary" id="appTourNext" type="button"></button>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

export function initTour() {
  const steps = getTourDefinitions();
  if (!steps.length) return;

  const root = createTourRoot();
  const card = root.querySelector('.app-tour__card');
  const spotlight = root.querySelector('#appTourSpotlight');
  const progress = root.querySelector('#appTourProgress');
  const title = root.querySelector('#appTourTitle');
  const description = root.querySelector('#appTourDescription');
  const closeButton = root.querySelector('#appTourClose');
  const skipButton = root.querySelector('#appTourSkip');
  const prevButton = root.querySelector('#appTourPrev');
  const nextButton = root.querySelector('#appTourNext');
  const trigger = document.getElementById('tourToggle');

  let currentStepIndex = 0;

  function positionSpotlight(target) {
    if (!spotlight) return;
    if (!target) {
      spotlight.style.display = 'none';
      return;
    }
    const rect = target.getBoundingClientRect();
    const pad = 8;
    spotlight.style.display = 'block';
    spotlight.style.top = `${rect.top + window.scrollY - pad}px`;
    spotlight.style.left = `${rect.left + window.scrollX - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
  }

  function positionCard(target) {
    const viewportPadding = 16;
    const cardWidth = Math.min(380, window.innerWidth - viewportPadding * 2);
    card.style.width = `${cardWidth}px`;

    if (!target) {
      card.style.top = '50%';
      card.style.left = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    card.style.transform = 'none';
    const rect = target.getBoundingClientRect();
    const cardHeight = card.offsetHeight || 220;
    const pad = 16;

    // prefer below, fallback above, fallback viewport center
    let top = rect.bottom + pad;
    if (top + cardHeight > window.innerHeight - viewportPadding) {
      top = rect.top - cardHeight - pad;
    }
    if (top < viewportPadding) {
      top = Math.max(viewportPadding, (window.innerHeight - cardHeight) / 2);
    }

    let left = rect.left;
    if (left + cardWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - cardWidth - viewportPadding;
    }
    if (left < viewportPadding) left = viewportPadding;

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function renderStep() {
    const step = steps[currentStepIndex];
    const target = document.querySelector(step.selector);

    title.textContent = t(step.titleKey, {}, step.titleKey.split('.').pop().replace(/([A-Z])/g, ' $1').trim());
    description.textContent = t(step.descriptionKey, {}, step.descriptionKey.split('.').pop().replace(/([A-Z])/g, ' $1').trim());
    progress.textContent = t('tour.progress', { current: currentStepIndex + 1, total: steps.length }, `Step ${currentStepIndex + 1} of ${steps.length}`);
    skipButton.textContent = t('tour.skip', {}, 'Skip');
    prevButton.textContent = t('tour.previous', {}, 'Previous');
    nextButton.textContent = currentStepIndex === steps.length - 1 ? t('tour.finish', {}, 'Finish') : t('tour.next', {}, 'Next');
    prevButton.disabled = currentStepIndex === 0;

    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    // Wait for smooth scroll to finish (~400ms) then position
    window.setTimeout(() => {
      const freshTarget = document.querySelector(step.selector);
      positionSpotlight(freshTarget);
      positionCard(freshTarget);
    }, 420);
  }

  function closeTour(markSeen = true) {
    root.hidden = true;
    document.body.classList.remove('tour-open');
    if (spotlight) spotlight.style.display = 'none';
    if (markSeen) {
      try {
        localStorage.setItem(getStorageKey(), 'true');
      } catch (_err) {}
    }
  }

  function openTour() {
    currentStepIndex = 0;
    root.hidden = false;
    document.body.classList.add('tour-open');
    renderStep();
  }

  function nextStep() {
    if (currentStepIndex === steps.length - 1) {
      closeTour(true);
      return;
    }
    currentStepIndex += 1;
    renderStep();
  }

  function previousStep() {
    if (currentStepIndex === 0) return;
    currentStepIndex -= 1;
    renderStep();
  }

  trigger?.addEventListener('click', openTour);
  closeButton?.addEventListener('click', () => closeTour(true));
  skipButton?.addEventListener('click', () => closeTour(true));
  prevButton?.addEventListener('click', previousStep);
  nextButton?.addEventListener('click', nextStep);
  root
    .querySelector('.app-tour__backdrop')
    ?.addEventListener('click', () => closeTour(true));

  window.addEventListener('resize', () => {
    if (!root.hidden) renderStep();
  });

  window.addEventListener('app:preferences-changed', () => {
    if (!root.hidden) renderStep();
  });

  try {
    if (
      AUTO_OPEN_PAGES.has(getPageKey()) &&
      !hasSeenTour()
    ) {
      window.setTimeout(openTour, 700);
    }
  } catch (_err) {}
}
