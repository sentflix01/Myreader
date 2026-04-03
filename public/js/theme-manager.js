/* eslint-disable */
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
    document
      .querySelector('meta[name=\"theme-color\"]')
      ?.setAttribute('content', theme === 'dark' ? '#0f172a' : '#fdf2e9');
    this.currentTheme = theme;
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
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`,
    );
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    this.setupToggle();

    // System theme changes (if no manual pref)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (!this.getStoredTheme()) this.applyTheme(e.matches ? 'dark' : 'light');
    });
  }
}

// Global init
let themeManager;
if (typeof window !== 'undefined') {
  themeManager = new ThemeManager();
  window.themeManager = themeManager;
}
