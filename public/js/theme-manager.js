/* eslint-disable */
import { ct, onLanguageChange, onPreferencesRefresh } from './i18n';

class ThemeManager {
  constructor() {
    this.storageKey = 'myreader_theme';
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  getSystemTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  getStoredTheme() {
    return localStorage.getItem(this.storageKey);
  }

  setStoredTheme(theme) {
    localStorage.setItem(this.storageKey, theme);
  }

  applyTheme(theme, animate = true) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f5f7fb');
    this.currentTheme = theme;
    window.dispatchEvent(
      new CustomEvent('myreader:theme-change', {
        detail: { theme, animate },
      }),
    );
  }

  setupToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', () => this.toggle());
    this.updateToggle(btn);
  }

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.setStoredTheme(newTheme);
    this.updateToggle(document.getElementById('themeToggle'));
  }

  updateToggle(btn) {
    if (!btn) return;
    btn.setAttribute(
      'aria-label',
      this.currentTheme === 'dark'
        ? ct('controls.themeSwitchToLight', null, 'Switch to light mode')
        : ct('controls.themeSwitchToDark', null, 'Switch to dark mode'),
    );
    btn.setAttribute('aria-pressed', String(this.currentTheme === 'dark'));
    btn.dataset.theme = this.currentTheme;
    btn.setAttribute(
      'title',
      this.currentTheme === 'dark'
        ? ct('controls.themeSwitchToLight', null, 'Switch to light mode')
        : ct('controls.themeSwitchToDark', null, 'Switch to dark mode'),
    );

    const icon = btn.querySelector('[data-theme-icon]');
    if (icon) {
      icon.className = `fas ${this.currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
    }

    const label = btn.querySelector('[data-theme-label]');
    if (label) {
      label.textContent =
        this.currentTheme === 'dark'
          ? ct('controls.themeLight', null, 'Light')
          : ct('controls.themeDark', null, 'Dark');
    }
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    this.setupToggle();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!this.getStoredTheme()) this.applyTheme(e.matches ? 'dark' : 'light');
      this.updateToggle(document.getElementById('themeToggle'));
    };

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(handleChange);
    }

    const refresh = () =>
      this.updateToggle(document.getElementById('themeToggle'));
    onLanguageChange(refresh);
    onPreferencesRefresh(refresh);
    window.addEventListener('myreader:theme-change', refresh);
  }
}

let themeManager;
if (typeof window !== 'undefined') {
  themeManager = new ThemeManager();
  window.themeManager = themeManager;
}
