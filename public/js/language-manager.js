/* eslint-disable */
class LanguageManager {
  constructor() {
    this.storageKey = 'myreader_language';
    this.currentLanguage = localStorage.getItem(this.storageKey) || 'en';
    this.init();
  }

  applyLanguage(lang) {
    document.documentElement.setAttribute('data-language', lang);
    this.currentLanguage = lang;
    localStorage.setItem(this.storageKey, lang);

    // Persist to user profile if logged in
    fetch('/api/v1/users/updateSettings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang }),
    }).catch(() => {}); // silent fail if not logged in
  }

  setupSelector() {
    const select = document.getElementById('languageSelect');
    if (!select) return;

    select.value = this.currentLanguage;
    select.addEventListener('change', (e) =>
      this.applyLanguage(e.target.value),
    );
  }

  init() {
    this.applyLanguage(this.currentLanguage);
    this.setupSelector();
  }
}

// Global
let langManager;
if (typeof window !== 'undefined') {
  langManager = new LanguageManager();
  window.languageManager = langManager;
}
