// Touch Gesture Handler for Mobile Interactions
class TouchGestureHandler {
  constructor() {
    this.isEnabled = 'ontouchstart' in window;
    this.gestures = new Map();
    this.activeGestures = new Map();
    
    if (this.isEnabled) {
      this.init();
    }
  }

  init() {
    console.log('👆 Touch Gesture Handler initialized');
    
    // Add touch event listeners
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    
    // Initialize common gestures
    this.initializeCommonGestures();
  }

  initializeCommonGestures() {
    // Swipe to close sidebars
    this.addSwipeGesture('.chat-sidebar', 'left', () => {
      const sidebar = document.querySelector('.chat-sidebar');
      if (sidebar && sidebar.classList.contains('show-sidebar')) {
        sidebar.classList.remove('show-sidebar');
      }
    });

    // Swipe to close sentbot
    this.addSwipeGesture('.chatbot', 'down', () => {
      if (document.body.classList.contains('show-chatbot')) {
        document.body.classList.remove('show-chatbot');
      }
    });

    // Pull to refresh (if needed)
    this.addPullToRefresh();

    // Long press for context menus
    this.addLongPressGesture();

    // Double tap to zoom (for images)
    this.addDoubleTapGesture();
  }

  addSwipeGesture(selector, direction, callback, threshold = 50) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const gestureId = `swipe-${direction}-${Date.now()}`;
      this.gestures.set(gestureId, {
        element,
        type: 'swipe',
        direction,
        callback,
        threshold
      });
    });
  }

  addLongPressGesture(selector = '.message', duration = 500) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const gestureId = `longpress-${Date.now()}`;
      this.gestures.set(gestureId, {
        element,
        type: 'longpress',
        duration,
        callback: (e) => this.showContextMenu(e)
      });
    });
  }

  addDoubleTapGesture(selector = 'img', maxDelay = 300) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const gestureId = `doubletap-${Date.now()}`;
      this.gestures.set(gestureId, {
        element,
        type: 'doubletap',
        maxDelay,
        callback: (e) => this.handleImageZoom(e),
        lastTap: 0
      });
    });
  }

  addPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const threshold = 100;
    let isPulling = false;

    const pullIndicator = this.createPullIndicator();

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();
        this.updatePullIndicator(pullIndicator, pullDistance, threshold);
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (isPulling && pullDistance > threshold) {
        this.triggerRefresh();
      }
      
      isPulling = false;
      pullDistance = 0;
      this.hidePullIndicator(pullIndicator);
    }, { passive: true });
  }

  createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
      <div class="pull-spinner"></div>
      <span class="pull-text">Pull to refresh</span>
    `;
    indicator.style.cssText = `
      position: fixed;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 10px 20px;
      border-radius: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
      transition: top 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
    return indicator;
  }

  updatePullIndicator(indicator, distance, threshold) {
    const progress = Math.min(distance / threshold, 1);
    const top = Math.min(distance - 60, 20);
    
    indicator.style.top = `${top}px`;
    indicator.style.opacity = progress;
    
    const spinner = indicator.querySelector('.pull-spinner');
    const text = indicator.querySelector('.pull-text');
    
    if (progress >= 1) {
      text.textContent = 'Release to refresh';
      spinner.style.animation = 'spin 1s linear infinite';
    } else {
      text.textContent = 'Pull to refresh';
      spinner.style.animation = 'none';
    }
  }

  hidePullIndicator(indicator) {
    indicator.style.top = '-60px';
    indicator.style.opacity = '0';
  }

  triggerRefresh() {
    console.log('🔄 Pull to refresh triggered');
    // Implement refresh logic here
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const element = e.target;
    
    // Store touch start data
    this.activeGestures.set('current', {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      element,
      moved: false
    });

    // Check for long press
    this.checkLongPress(e);
  }

  handleTouchMove(e) {
    const current = this.activeGestures.get('current');
    if (!current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - current.startX;
    const deltaY = touch.clientY - current.startY;
    
    // Mark as moved if significant movement
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      current.moved = true;
      this.clearLongPressTimer();
    }

    // Update current gesture data
    current.currentX = touch.clientX;
    current.currentY = touch.clientY;
    current.deltaX = deltaX;
    current.deltaY = deltaY;
  }

  handleTouchEnd(e) {
    const current = this.activeGestures.get('current');
    if (!current) return;

    const duration = Date.now() - current.startTime;
    
    // Check for swipe gestures
    if (current.moved) {
      this.checkSwipeGestures(current);
    } else {
      // Check for tap gestures
      this.checkTapGestures(e, current, duration);
    }

    this.clearLongPressTimer();
    this.activeGestures.delete('current');
  }

  handleTouchCancel(e) {
    this.clearLongPressTimer();
    this.activeGestures.delete('current');
  }

  checkLongPress(e) {
    this.gestures.forEach((gesture, id) => {
      if (gesture.type === 'longpress' && gesture.element.contains(e.target)) {
        this.longPressTimer = setTimeout(() => {
          const current = this.activeGestures.get('current');
          if (current && !current.moved) {
            gesture.callback(e);
          }
        }, gesture.duration);
      }
    });
  }

  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  checkSwipeGestures(current) {
    const { deltaX, deltaY } = current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let direction = null;
    let distance = 0;

    if (absX > absY) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
      distance = absX;
    } else {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
      distance = absY;
    }

    this.gestures.forEach((gesture, id) => {
      if (gesture.type === 'swipe' && 
          gesture.direction === direction && 
          distance >= gesture.threshold &&
          gesture.element.contains(current.element)) {
        gesture.callback(current);
      }
    });
  }

  checkTapGestures(e, current, duration) {
    // Check for double tap
    this.gestures.forEach((gesture, id) => {
      if (gesture.type === 'doubletap' && gesture.element.contains(e.target)) {
        const now = Date.now();
        if (now - gesture.lastTap < gesture.maxDelay) {
          gesture.callback(e);
        }
        gesture.lastTap = now;
      }
    });
  }

  showContextMenu(e) {
    e.preventDefault();
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'touch-context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="copy">Copy</div>
      <div class="context-menu-item" data-action="share">Share</div>
      <div class="context-menu-item" data-action="delete">Delete</div>
    `;
    
    menu.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 120px;
      overflow: hidden;
    `;
    
    // Position menu
    const rect = e.target.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 10}px`;
    
    document.body.appendChild(menu);
    
    // Handle menu clicks
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action, e.target);
      }
      document.body.removeChild(menu);
    });
    
    // Remove menu on outside click
    setTimeout(() => {
      document.addEventListener('click', function removeMenu() {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', removeMenu);
      });
    }, 100);
  }

  handleContextMenuAction(action, originalTarget) {
    console.log(`Context menu action: ${action}`);
    
    switch (action) {
      case 'copy':
        // Implement copy functionality
        break;
      case 'share':
        // Implement share functionality
        if (navigator.share) {
          navigator.share({
            title: 'Shared from MyReader',
            url: window.location.href
          });
        }
        break;
      case 'delete':
        // Implement delete functionality
        break;
    }
  }

  handleImageZoom(e) {
    const img = e.target;
    
    if (img.classList.contains('zoomed')) {
      // Zoom out
      img.classList.remove('zoomed');
      img.style.transform = 'scale(1)';
      img.style.zIndex = 'auto';
    } else {
      // Zoom in
      img.classList.add('zoomed');
      img.style.transform = 'scale(2)';
      img.style.zIndex = '1000';
      img.style.transition = 'transform 0.3s ease';
    }
  }

  // Public methods
  addCustomGesture(selector, type, options, callback) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const gestureId = `custom-${type}-${Date.now()}`;
      this.gestures.set(gestureId, {
        element,
        type,
        callback,
        ...options
      });
    });
  }

  removeGesture(gestureId) {
    this.gestures.delete(gestureId);
  }

  disable() {
    this.isEnabled = false;
    this.gestures.clear();
    this.activeGestures.clear();
  }
}

// Initialize touch gesture handler
const touchGestureHandler = new TouchGestureHandler();

// Expose globally for debugging
window.touchGestureHandler = touchGestureHandler;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchGestureHandler;
}
