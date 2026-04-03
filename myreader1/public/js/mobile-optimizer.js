/* eslint-disable */

/**
 * Mobile Performance Optimizations
 * Handles viewport, touch interactions, and performance improvements
 */

class MobileOptimizer {
  constructor() {
    this.isTouch = 'ontouchstart' in window;
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.viewportHeight = window.innerHeight;
    this.init();
  }

  init() {
    this.setupViewport();
    this.setupTouchOptimizations();
    this.setupScrollOptimizations();
    this.setupKeyboardHandling();
    this.setupOrientationHandling();
    this.setupPerformanceOptimizations();
  }

  setupViewport() {
    // Fix viewport height issues on mobile
    const setViewportHeight = () => {
      this.viewportHeight = window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${this.viewportHeight * 0.01}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });

    // Prevent zoom on input focus (iOS)
    if (this.isMobile) {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (input.style.fontSize === '' || parseFloat(input.style.fontSize) < 16) {
          input.style.fontSize = '16px';
        }
      });
    }
  }

  setupTouchOptimizations() {
    if (!this.isTouch) return;

    // Add touch class to body
    document.body.classList.add('touch-device');

    // Improve touch responsiveness
    document.addEventListener('touchstart', () => {}, { passive: true });

    // Handle touch feedback
    this.setupTouchFeedback();

    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button, .btn, [role=\"button\"]');
    buttons.forEach(button => {
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        button.click();
      }, { passive: false });
    });
  }

  setupTouchFeedback() {
    const touchElements = document.querySelectorAll('button, .btn, a, [role=\"button\"], .touch-feedback');
    
    touchElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        element.classList.add('touch-active');
      }, { passive: true });

      element.addEventListener('touchend', () => {
        setTimeout(() => {
          element.classList.remove('touch-active');
        }, 150);
      }, { passive: true });

      element.addEventListener('touchcancel', () => {
        element.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  setupScrollOptimizations() {
    // Smooth scrolling polyfill for older browsers
    if (!('scrollBehavior' in document.documentElement.style)) {
      this.loadSmoothScrollPolyfill();
    }

    // Optimize scroll performance
    let ticking = false;
    const scrollElements = document.querySelectorAll('.scroll-optimized, .chat-messages, .sentbot-messages');
    
    scrollElements.forEach(element => {
      element.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            // Handle scroll-based optimizations
            this.handleScrollOptimization(element);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    });

    // Prevent overscroll bounce on iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.body.style.overscrollBehavior = 'none';
    }
  }

  handleScrollOptimization(element) {
    // Lazy load images in viewport
    const images = element.querySelectorAll('img[data-src]');
    images.forEach(img => {
      if (this.isInViewport(img)) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }

  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  setupKeyboardHandling() {
    if (!this.isMobile) return;

    let initialViewportHeight = window.innerHeight;
    
    // Handle virtual keyboard
    const handleKeyboard = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) {
        // Keyboard is likely open
        document.body.classList.add('keyboard-open');
        this.adjustForKeyboard(heightDifference);
      } else {
        // Keyboard is likely closed
        document.body.classList.remove('keyboard-open');
        this.resetKeyboardAdjustments();
      }
    };

    window.addEventListener('resize', handleKeyboard);
    
    // Handle input focus/blur
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          this.scrollToInput(input);
        }, 300);
      });
    });
  }

  adjustForKeyboard(keyboardHeight) {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const rect = activeElement.getBoundingClientRect();
      const availableHeight = window.innerHeight;
      
      if (rect.bottom > availableHeight - 50) {
        const scrollAmount = rect.bottom - availableHeight + 100;
        window.scrollBy(0, scrollAmount);
      }
    }
  }

  resetKeyboardAdjustments() {
    // Reset any keyboard-specific adjustments
    document.documentElement.style.removeProperty('--keyboard-height');
  }

  scrollToInput(input) {
    const rect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const inputTop = rect.top + window.pageYOffset;
    const targetPosition = inputTop - (viewportHeight / 3);
    
    window.scrollTo({
      top: Math.max(0, targetPosition),
      behavior: 'smooth'
    });
  }

  setupOrientationHandling() {
    const handleOrientationChange = () => {
      // Hide address bar on mobile browsers
      if (this.isMobile) {
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 100);
      }
      
      // Update viewport height
      setTimeout(() => {
        this.viewportHeight = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${this.viewportHeight * 0.01}px`);
      }, 500);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('orientationChanged', {
        detail: {
          orientation: screen.orientation?.angle || window.orientation || 0,
          height: window.innerHeight,
          width: window.innerWidth
        }
      }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);
  }

  setupPerformanceOptimizations() {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize animations
    this.optimizeAnimations();
    
    // Setup intersection observer for lazy loading
    this.setupLazyLoading();
    
    // Debounce resize events
    this.setupResizeOptimization();
  }

  preloadCriticalResources() {
    const criticalImages = document.querySelectorAll('img[data-critical]');
    criticalImages.forEach(img => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img.src || img.dataset.src;
      document.head.appendChild(link);
    });
  }

  optimizeAnimations() {
    // Reduce animations on low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      document.body.classList.add('reduced-animations');
    }
    
    // Pause animations when page is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        document.body.classList.add('animations-paused');
      } else {
        document.body.classList.remove('animations-paused');
      }
    });
  }

  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px'
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  setupResizeOptimization() {
    let resizeTimer;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('debouncedResize', {
          detail: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }));
      }, 250);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
  }

  loadSmoothScrollPolyfill() {
    if (!window.smoothScrollPolyfillLoaded) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/smoothscroll-polyfill@0.4.4/dist/smoothscroll.min.js';
      script.onload = () => {
        window.smoothScrollPolyfillLoaded = true;
        if (window.smoothscroll) {
          window.smoothscroll.polyfill();
        }
      };
      document.head.appendChild(script);
    }
  }

  // Public methods
  getDeviceInfo() {
    return {
      isTouch: this.isTouch,
      isMobile: this.isMobile,
      viewportHeight: this.viewportHeight,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation?.angle || window.orientation || 0
    };
  }

  optimizeForDevice() {
    const info = this.getDeviceInfo();
    
    // Apply device-specific optimizations
    if (info.pixelRatio > 2) {
      document.body.classList.add('high-dpi');
    }
    
    if (info.isMobile) {
      document.body.classList.add('mobile-device');
    }
    
    return info;
  }
}

// Initialize mobile optimizer
let mobileOptimizer;

function initMobileOptimizer() {
  if (typeof window === 'undefined') return;
  
  mobileOptimizer = new MobileOptimizer();
  window.mobileOptimizer = mobileOptimizer;
  
  console.log('Mobile optimizer initialized:', mobileOptimizer.getDeviceInfo());
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileOptimizer);
  } else {
    initMobileOptimizer();
  }
}

export { MobileOptimizer, initMobileOptimizer };