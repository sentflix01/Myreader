// Mobile Performance Monitor
class MobilePerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: null,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      firstInputDelay: null,
      cumulativeLayoutShift: 0,
      touchResponsiveness: [],
      memoryUsage: null,
      networkInfo: null,
      deviceInfo: null
    };
    
    this.isEnabled = this.shouldEnable();
    if (this.isEnabled) {
      this.init();
    }
  }

  shouldEnable() {
    // Enable on mobile devices or when explicitly requested
    return window.innerWidth <= 768 || 
           /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           localStorage.getItem('enable_performance_monitor') === 'true';
  }

  init() {
    console.log('📱 Mobile Performance Monitor initialized');
    
    this.collectDeviceInfo();
    this.collectNetworkInfo();
    this.monitorPageLoad();
    this.monitorWebVitals();
    this.monitorTouchResponsiveness();
    this.monitorMemoryUsage();
    this.setupReporting();
  }

  collectDeviceInfo() {
    this.metrics.deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation ? screen.orientation.angle : 0,
      touchSupport: 'ontouchstart' in window,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    };
  }

  collectNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.metrics.networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
  }

  monitorPageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.pageLoad = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        };
      }
    });
  }

  monitorWebVitals() {
    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
      }
    });
    observer.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    if ('LargestContentfulPaint' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Cumulative Layout Shift
    if ('LayoutShift' in window) {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            this.metrics.cumulativeLayoutShift += entry.value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // First Input Delay
    if ('FirstInputDelay' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    }
  }

  monitorTouchResponsiveness() {
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartTime = performance.now();
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (touchStartTime > 0) {
        const responseTime = performance.now() - touchStartTime;
        this.metrics.touchResponsiveness.push(responseTime);
        
        // Keep only last 10 measurements
        if (this.metrics.touchResponsiveness.length > 10) {
          this.metrics.touchResponsiveness.shift();
        }
        
        touchStartTime = 0;
      }
    }, { passive: true });
  }

  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.memoryUsage = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
      }, 30000); // Every 30 seconds
    }
  }

  setupReporting() {
    // Report metrics every 60 seconds
    setInterval(() => {
      this.reportMetrics();
    }, 60000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });

    // Report on visibility change (app backgrounded/foregrounded)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });
  }

  getAverageTouchResponse() {
    if (this.metrics.touchResponsiveness.length === 0) return null;
    const sum = this.metrics.touchResponsiveness.reduce((a, b) => a + b, 0);
    return sum / this.metrics.touchResponsiveness.length;
  }

  getPerformanceGrade() {
    let score = 100;
    
    // Page load performance
    if (this.metrics.pageLoad && this.metrics.pageLoad.totalTime > 3000) {
      score -= 20;
    }
    
    // First Contentful Paint
    if (this.metrics.firstContentfulPaint > 1500) {
      score -= 15;
    }
    
    // Largest Contentful Paint
    if (this.metrics.largestContentfulPaint > 2500) {
      score -= 15;
    }
    
    // Cumulative Layout Shift
    if (this.metrics.cumulativeLayoutShift > 0.1) {
      score -= 10;
    }
    
    // Touch responsiveness
    const avgTouch = this.getAverageTouchResponse();
    if (avgTouch && avgTouch > 100) {
      score -= 15;
    }
    
    // Network conditions
    if (this.metrics.networkInfo && this.metrics.networkInfo.effectiveType === 'slow-2g') {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  reportMetrics() {
    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      averageTouchResponse: this.getAverageTouchResponse(),
      performanceGrade: this.getPerformanceGrade()
    };
    
    // Log to console for debugging
    console.log('📊 Mobile Performance Report:', report);
    
    // Send to server (if endpoint exists)
    if (typeof fetch !== 'undefined') {
      fetch('/api/v1/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
        credentials: 'include'
      }).catch(err => {
        // Silently fail if analytics endpoint doesn't exist
        console.debug('Performance analytics not available:', err.message);
      });
    }
    
    // Store locally for debugging
    try {
      const existingReports = JSON.parse(localStorage.getItem('mobile_performance_reports') || '[]');
      existingReports.push(report);
      
      // Keep only last 10 reports
      if (existingReports.length > 10) {
        existingReports.shift();
      }
      
      localStorage.setItem('mobile_performance_reports', JSON.stringify(existingReports));
    } catch (err) {
      console.debug('Could not store performance report locally:', err.message);
    }
  }

  // Public method to get current metrics
  getCurrentMetrics() {
    return {
      ...this.metrics,
      averageTouchResponse: this.getAverageTouchResponse(),
      performanceGrade: this.getPerformanceGrade()
    };
  }

  // Public method to enable/disable monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('enable_performance_monitor', enabled.toString());
    
    if (enabled && !this.initialized) {
      this.init();
    }
  }
}

// Initialize performance monitor
const mobilePerformanceMonitor = new MobilePerformanceMonitor();

// Expose globally for debugging
window.mobilePerformanceMonitor = mobilePerformanceMonitor;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobilePerformanceMonitor;
}