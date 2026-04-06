/* eslint-disable */
import { updateSettings } from './updateSettings';

class LanguageManager {
  constructor() {
    this.storageKey = 'myreader_language';
    this.legacyStorageKey = 'sentreader_language';
    this.currentLanguage = this.getStoredLanguage() || this.getHtmlLanguage() || 'en';
    this.init();
  }

  init() {
    // Apply language immediately to avoid flash
    this.applyLanguage(this.currentLanguage, false);

    // Wire selector
    this.setupSelector();
  }

  getHtmlLanguage() {
    try {
      return document.documentElement.getAttribute('data-language');
    } catch (e) {
      return null;
    }
  }

  getStoredLanguage() {
    if (typeof localStorage === 'undefined') return null;
    const current = localStorage.getItem(this.storageKey);
    if (current) return current;
    const legacy = localStorage.getItem(this.legacyStorageKey);
    if (legacy) {
      localStorage.setItem(this.storageKey, legacy);
      return legacy;
    }
    return null;
  }

  setStoredLanguage(lang) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, lang);
  }

  applyLanguage(lang, animate = true) {
    const html = document.documentElement;
    if (!animate) html.classList.add('no-transitions');
    html.setAttribute('data-language', lang);
    if (!animate) {
      requestAnimationFrame(() => html.classList.remove('no-transitions'));
    }
    this.currentLanguage = lang;
    // Broadcast event for other modules
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  async persistLanguage(lang) {
    try {
      // Use existing updateSettings helper to PATCH user data when logged in
      await updateSettings({ preferredLanguage: lang }, 'data');
    } catch (err) {
      // ignore -- user might not be logged in or network failed
      // console.debug('persistLanguage failed', err);
    }
  }

  setupSelector() {
    const select = document.getElementById('languageSelect');
    if (!select) return;

    // Initialize selected value
    try {
      select.value = this.currentLanguage;
    } catch (e) {}

    select.addEventListener('change', async (e) => {
      const lang = e.target.value || 'en';
      this.applyLanguage(lang);
      this.setStoredLanguage(lang);
      await this.persistLanguage(lang);
    });
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  setLanguage(lang) {
    if (!lang) return;
    this.applyLanguage(lang);
    this.setStoredLanguage(lang);
    this.persistLanguage(lang);
  }
}

let languageManager;

export function initLanguage() {
  if (typeof window === 'undefined') return;
  languageManager = new LanguageManager();
  window.languageManager = languageManager;
}

export function getLanguageManager() {
  return languageManager;
}

// Auto-init
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLanguage);
  else initLanguage();
}

export { LanguageManager };
