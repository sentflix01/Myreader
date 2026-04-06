/* eslint-disable */
const ALLOWED_LANGUAGES = new Set(['en', 'am']);

class LanguageManager {
  constructor() {
    this.storageKey = 'myreader_language';
    this.cookieKey = 'myreader_language';
    this.currentLanguage = this.normalizeLanguage(
      localStorage.getItem(this.storageKey) || document.documentElement.lang || 'en',
    );
    this.init();
  }

  normalizeLanguage(lang) {
    return ALLOWED_LANGUAGES.has(lang) ? lang : 'en';
  }

  getCurrentUserId() {
    return (
      document.querySelector('meta[name="user-id"]')?.content ||
      document.body?.dataset?.userId ||
      ''
    );
  }

  setLanguageCookie(lang) {
    document.cookie = `${this.cookieKey}=${encodeURIComponent(
      lang,
    )}; path=/; max-age=31536000; SameSite=Lax`;
  }

  applyLanguage(lang, { syncRemote = true, reload = false } = {}) {
    const nextLanguage = this.normalizeLanguage(lang);
    const hasChanged = nextLanguage !== this.currentLanguage;
    document.documentElement.setAttribute('data-language', nextLanguage);
    document.documentElement.lang = nextLanguage;
    this.currentLanguage = nextLanguage;
    localStorage.setItem(this.storageKey, nextLanguage);
    this.setLanguageCookie(nextLanguage);

    window.dispatchEvent(
      new CustomEvent('myreader:language-change', {
        detail: { language: nextLanguage },
      }),
    );
    window.dispatchEvent(new CustomEvent('myreader:preferences-refresh'));

    // Persist to user profile if logged in
    if (reload && hasChanged) {
      window.setTimeout(() => window.location.reload(), 10);
    }

    if (!syncRemote || !this.getCurrentUserId()) return;

    fetch('/api/v1/users/updateMe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({ preferredLanguage: nextLanguage }),
    }).catch(() => {}); // silent fail if not logged in
  }

  setupSelector() {
    const select = document.getElementById('languageSelect');
    if (!select) return;

    select.value = this.currentLanguage;
    select.addEventListener('change', (e) =>
      this.applyLanguage(e.target.value, { reload: true }),
    );
  }

  init() {
    this.applyLanguage(this.currentLanguage, { syncRemote: false, reload: false });
    this.setupSelector();
  }
}

// Global
let langManager;
if (typeof window !== 'undefined') {
  langManager = new LanguageManager();
  window.languageManager = langManager;
}
