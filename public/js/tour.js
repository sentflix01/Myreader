/* eslint-disable */
import { ct, onLanguageChange, onPreferencesRefresh } from './i18n';
import {
  closeSidebar,
  isDesktop,
  openSidebar,
  setBottomPanelOpen,
} from './sidebarToggle';

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
      localStorage.getItem(getStorageKey(LEGACY_TOUR_STORAGE_PREFIX)) === 'true'
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

  return (pageDefinitions[pageKey] || [commonControls])
    .filter((step) => {
      const selectors = step.selector.split(',').map((s) => s.trim());
      return selectors.some((sel) => {
        try {
          return Boolean(document.querySelector(sel));
        } catch (_) {
          return false;
        }
      });
    })
    .map((step) => ({
      ...step,
      selector:
        step.selector
          .split(',')
          .map((s) => s.trim())
          .find((sel) => {
            try {
              return Boolean(document.querySelector(sel));
            } catch (_) {
              return false;
            }
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
        <button class="app-tour__close" id="appTourClose" type="button" aria-label="">&times;</button>
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

function keyFallback(key) {
  return key
    .split('.')
    .pop()
    .replace(/([A-Z])/g, ' $1')
    .trim();
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
  let chatTourInitialState = null;

  function prepareChatStep(step) {
    if (getPageKey() !== 'chat') return;

    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const isMobileLayout = !isDesktop();

    if (!leftSidebar || !rightSidebar) return;

    if (!chatTourInitialState) {
      chatTourInitialState = {
        leftOpen: isMobileLayout
          ? leftSidebar.classList.contains('show-sidebar')
          : !leftSidebar.classList.contains('sidebar-collapsed'),
        rightOpen: isMobileLayout
          ? rightSidebar.classList.contains('show-sidebar')
          : !rightSidebar.classList.contains('sidebar-collapsed'),
        bottomOpen:
          document.getElementById('bottomPanel')?.dataset.collapsed !== 'true',
      };
    }

    const selector = step?.selector || '';

    if (selector.includes('#chatInputContainer')) {
      setBottomPanelOpen(true);
    }

    if (!isMobileLayout) return;

    if (selector.includes('#leftSidebar')) {
      openSidebar(leftSidebar);
      closeSidebar(rightSidebar);
      overlay?.classList.add('active');
      return;
    }

    if (selector.includes('#rightSidebar')) {
      openSidebar(rightSidebar);
      closeSidebar(leftSidebar);
      overlay?.classList.add('active');
      return;
    }

    closeSidebar(leftSidebar);
    closeSidebar(rightSidebar);
    overlay?.classList.remove('active');
  }

  function restoreChatTourState() {
    if (getPageKey() !== 'chat' || !chatTourInitialState) return;

    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const isMobileLayout = !isDesktop();

    if (leftSidebar) {
      if (chatTourInitialState.leftOpen) openSidebar(leftSidebar);
      else closeSidebar(leftSidebar);
    }
    if (rightSidebar) {
      if (chatTourInitialState.rightOpen) openSidebar(rightSidebar);
      else closeSidebar(rightSidebar);
    }
    if (overlay) {
      overlay.classList.toggle(
        'active',
        isMobileLayout &&
          (chatTourInitialState.leftOpen || chatTourInitialState.rightOpen),
      );
    }
    setBottomPanelOpen(chatTourInitialState.bottomOpen);
    chatTourInitialState = null;
  }

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

    let top = rect.bottom + pad;
    if (top + cardHeight > window.innerHeight - viewportPadding) {
      top = rect.top - cardHeight - pad;
    }
    if (top < viewportPadding) {
      top = Math.max(viewportPadding, (window.innerHeight - cardHeight) / 2);
    }
    const maxTop = Math.max(viewportPadding, window.innerHeight - cardHeight - viewportPadding);
    if (top > maxTop) top = maxTop;

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
    prepareChatStep(step);
    const target = document.querySelector(step.selector);

    title.textContent = ct(
      step.titleKey,
      {},
      keyFallback(step.titleKey),
    );
    description.textContent = ct(
      step.descriptionKey,
      {},
      keyFallback(step.descriptionKey),
    );
    progress.textContent = ct(
      'tour.progress',
      { current: currentStepIndex + 1, total: steps.length },
      `Step ${currentStepIndex + 1} of ${steps.length}`,
    );
    skipButton.textContent = ct('tour.skip', {}, 'Skip');
    prevButton.textContent = ct('tour.previous', {}, 'Previous');
    nextButton.textContent =
      currentStepIndex === steps.length - 1
        ? ct('tour.finish', {}, 'Finish')
        : ct('tour.next', {}, 'Next');
    prevButton.disabled = currentStepIndex === 0;
    closeButton.setAttribute(
      'aria-label',
      ct('tour.close', {}, 'Close tour'),
    );
    closeButton.setAttribute(
      'title',
      ct('tour.close', {}, 'Close tour'),
    );

    if (target) {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }

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
    restoreChatTourState();
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
    chatTourInitialState = null;
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

  const refreshTourText = () => {
    if (!root.hidden) renderStep();
  };
  onLanguageChange(refreshTourText);
  onPreferencesRefresh(refreshTourText);
  window.addEventListener('myreader:theme-change', refreshTourText);

  try {
    if (AUTO_OPEN_PAGES.has(getPageKey()) && !hasSeenTour()) {
      window.setTimeout(openTour, 700);
    }
  } catch (_err) {}
}
