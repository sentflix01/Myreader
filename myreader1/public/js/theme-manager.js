/* eslint-disable */

class ThemeManager {
  constructor() {
    this.storageKey = 'myreader_theme';
    this.legacyStorageKey = 'sentreader_theme';
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    // Apply theme immediately to prevent flash
    this.applyTheme(this.currentTheme, false);
    
    // Set up toggle button
    this.setupToggleButton();
    
    // Listen for system theme changes
    this.setupSystemThemeListener();
    
    // Update toggle button state
    this.updateToggleButton();
  }

  getSystemTheme() {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getStoredTheme() {
    if (typeof localStorage === 'undefined') return null;
    const currentTheme = localStorage.getItem(this.storageKey);
    if (currentTheme !== null) return currentTheme;

    const legacyTheme = localStorage.getItem(this.legacyStorageKey);
    if (legacyTheme !== null) {
      localStorage.setItem(this.storageKey, legacyTheme);
    }
    return legacyTheme;
  }

  setStoredTheme(theme) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, theme);
  }

  applyTheme(theme, animate = true) {
    const html = document.documentElement;
    
    // Prevent transitions during initial load
    if (!animate) {
      html.classList.add('no-transitions');
    }
    
    // Apply theme
    html.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
    
    // Re-enable transitions after a brief delay
    if (!animate) {
      requestAnimationFrame(() => {
        html.classList.remove('no-transitions');
      });
    }
    
    this.currentTheme = theme;
  }

  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    const colors = {
      light: '#fdf2e9',
      dark: '#0f172a'
    };
    
    metaThemeColor.content = colors[theme] || colors.light;
  }

  setupToggleButton() {
    const toggleButton = document.getElementById('themeToggle');
    if (!toggleButton) return;

    // Create new toggle structure if needed
    if (!toggleButton.querySelector('.theme-toggle__slider')) {
      toggleButton.innerHTML = `
        <div class="theme-toggle__slider">
          <i class="fas fa-sun theme-toggle__icon theme-toggle__icon--sun"></i>
          <i class="fas fa-moon theme-toggle__icon theme-toggle__icon--moon"></i>
        </div>
      `;
      toggleButton.classList.add('theme-toggle');
    }

    toggleButton.addEventListener('click', () => {
      this.toggle();
    });

    // Add keyboard support
    toggleButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  setupSystemThemeListener() {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!this.getStoredTheme()) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.updateToggleButton();
      }
    });
  }

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.setStoredTheme(newTheme);
    this.updateToggleButton();
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: newTheme }
    }));
  }

  updateToggleButton() {
    const toggleButton = document.getElementById('themeToggle');
    if (!toggleButton) return;

    const label = toggleButton.querySelector('[data-theme-label]');
    if (label) {
      label.textContent = this.currentTheme === 'dark' ? 'Dark' : 'Light';
    }

    // Update aria-label for accessibility
    toggleButton.setAttribute('aria-label', 
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    this.applyTheme(theme);
    this.setStoredTheme(theme);
    this.updateToggleButton();
  }
}

// Initialize theme manager
let themeManager;

export function initTheme() {
  if (typeof window === 'undefined') return;
  
  themeManager = new ThemeManager();
  
  // Make theme manager globally available
  window.themeManager = themeManager;
}

export function getThemeManager() {
  return themeManager;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
}

// Export for manual initialization
export { ThemeManager };
