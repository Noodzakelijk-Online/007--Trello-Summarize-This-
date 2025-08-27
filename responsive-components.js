/**
 * Responsive Components and Mobile Interactions
 * 
 * Handles responsive behavior, touch interactions, and mobile-specific
 * functionality for the Summarize This application.
 */

class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      wide: 1400
    };
    
    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.isTouch = this.detectTouch();
    this.orientation = this.getOrientation();
    
    this.resizeTimeout = null;
    this.orientationTimeout = null;
    
    this.init();
  }

  /**
   * Initialize responsive manager
   */
  init() {
    this.setupEventListeners();
    this.setupTouchHandlers();
    this.setupKeyboardNavigation();
    this.setupAccessibility();
    this.handleInitialLayout();
    
    console.log('Responsive Manager initialized', {
      breakpoint: this.currentBreakpoint,
      isTouch: this.isTouch,
      orientation: this.orientation
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Window resize handler with debouncing
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 150);
    });

    // Orientation change handler
    window.addEventListener('orientationchange', () => {
      clearTimeout(this.orientationTimeout);
      this.orientationTimeout = setTimeout(() => {
        this.handleOrientationChange();
      }, 300);
    });

    // Viewport meta tag adjustment for iOS
    if (this.isIOS()) {
      window.addEventListener('orientationchange', () => {
        this.adjustViewportForIOS();
      });
    }

    // Handle visibility change for mobile browsers
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Set up touch handlers
   */
  setupTouchHandlers() {
    if (!this.isTouch) return;

    // Prevent zoom on double tap for specific elements
    const preventZoomElements = document.querySelectorAll('.btn, .nav-tab, .upload-area');
    preventZoomElements.forEach(element => {
      element.addEventListener('touchend', this.preventDoubleZoom.bind(this));
    });

    // Add touch feedback
    this.setupTouchFeedback();

    // Handle swipe gestures
    this.setupSwipeGestures();

    // Improve scroll performance
    this.setupScrollOptimization();
  }

  /**
   * Set up keyboard navigation for mobile
   */
  setupKeyboardNavigation() {
    // Handle virtual keyboard on mobile
    if (this.isMobile()) {
      this.setupVirtualKeyboardHandling();
    }

    // Improve tab navigation
    this.setupTabNavigation();
  }

  /**
   * Set up accessibility features
   */
  setupAccessibility() {
    // Add screen reader announcements for dynamic content
    this.setupScreenReaderAnnouncements();

    // Improve focus management
    this.setupFocusManagement();

    // Add skip links for mobile
    if (this.isMobile()) {
      this.addSkipLinks();
    }
  }

  /**
   * Handle initial layout setup
   */
  handleInitialLayout() {
    this.adjustLayoutForBreakpoint();
    this.optimizeForDevice();
    this.setupDynamicViewport();
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const newBreakpoint = this.getCurrentBreakpoint();
    
    if (newBreakpoint !== this.currentBreakpoint) {
      const oldBreakpoint = this.currentBreakpoint;
      this.currentBreakpoint = newBreakpoint;
      
      this.onBreakpointChange(oldBreakpoint, newBreakpoint);
    }

    this.adjustLayoutForBreakpoint();
    this.updateDynamicElements();
  }

  /**
   * Handle orientation change
   */
  handleOrientationChange() {
    const newOrientation = this.getOrientation();
    
    if (newOrientation !== this.orientation) {
      const oldOrientation = this.orientation;
      this.orientation = newOrientation;
      
      this.onOrientationChange(oldOrientation, newOrientation);
    }

    // Force layout recalculation
    setTimeout(() => {
      this.adjustLayoutForBreakpoint();
      this.updateDynamicElements();
    }, 100);
  }

  /**
   * Handle breakpoint changes
   */
  onBreakpointChange(oldBreakpoint, newBreakpoint) {
    console.log(`Breakpoint changed: ${oldBreakpoint} → ${newBreakpoint}`);
    
    // Update body class
    document.body.classList.remove(`breakpoint-${oldBreakpoint}`);
    document.body.classList.add(`breakpoint-${newBreakpoint}`);
    
    // Adjust navigation
    this.adjustNavigation();
    
    // Adjust modals
    this.adjustModals();
    
    // Adjust grid layouts
    this.adjustGridLayouts();
    
    // Emit custom event
    window.dispatchEvent(new CustomEvent('breakpointChange', {
      detail: { oldBreakpoint, newBreakpoint }
    }));
  }

  /**
   * Handle orientation changes
   */
  onOrientationChange(oldOrientation, newOrientation) {
    console.log(`Orientation changed: ${oldOrientation} → ${newOrientation}`);
    
    // Update body class
    document.body.classList.remove(`orientation-${oldOrientation}`);
    document.body.classList.add(`orientation-${newOrientation}`);
    
    // Adjust layout for landscape on mobile
    if (this.isMobile() && newOrientation === 'landscape') {
      this.optimizeForMobileLandscape();
    }
    
    // Emit custom event
    window.dispatchEvent(new CustomEvent('orientationChange', {
      detail: { oldOrientation, newOrientation }
    }));
  }

  /**
   * Adjust layout for current breakpoint
   */
  adjustLayoutForBreakpoint() {
    const breakpoint = this.currentBreakpoint;
    
    // Adjust content grid
    const contentGrid = document.querySelector('.content-grid');
    if (contentGrid) {
      if (breakpoint === 'mobile') {
        contentGrid.style.gridTemplateColumns = '1fr';
      } else if (breakpoint === 'tablet') {
        contentGrid.style.gridTemplateColumns = '1fr 280px';
      } else {
        contentGrid.style.gridTemplateColumns = '1fr 300px';
      }
    }
    
    // Adjust navigation
    this.adjustNavigation();
    
    // Adjust side panel order
    this.adjustSidePanelOrder();
  }

  /**
   * Adjust navigation for different breakpoints
   */
  adjustNavigation() {
    const navTabs = document.querySelector('.nav-tabs');
    const header = document.querySelector('.header');
    
    if (!navTabs || !header) return;
    
    if (this.isMobile()) {
      // Move navigation to bottom on mobile
      if (!navTabs.classList.contains('mobile-nav')) {
        navTabs.classList.add('mobile-nav');
        document.body.appendChild(navTabs);
        document.body.classList.add('has-bottom-nav');
      }
    } else {
      // Move navigation back to header
      if (navTabs.classList.contains('mobile-nav')) {
        navTabs.classList.remove('mobile-nav');
        header.querySelector('.header-left').appendChild(navTabs);
        document.body.classList.remove('has-bottom-nav');
      }
    }
  }

  /**
   * Adjust side panel order
   */
  adjustSidePanelOrder() {
    const sidePanel = document.querySelector('.side-panel');
    
    if (!sidePanel) return;
    
    if (this.isMobile() || this.isTablet()) {
      sidePanel.style.order = '-1';
    } else {
      sidePanel.style.order = '0';
    }
  }

  /**
   * Adjust modals for mobile
   */
  adjustModals() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      if (this.isMobile()) {
        modal.classList.add('mobile-modal');
      } else {
        modal.classList.remove('mobile-modal');
      }
    });
  }

  /**
   * Adjust grid layouts
   */
  adjustGridLayouts() {
    const optionsGrids = document.querySelectorAll('.options-grid');
    const statsGrids = document.querySelectorAll('.stats-grid');
    
    optionsGrids.forEach(grid => {
      if (this.isMobile()) {
        grid.style.gridTemplateColumns = '1fr';
      } else if (this.isTablet()) {
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
        grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      }
    });
    
    statsGrids.forEach(grid => {
      if (this.isMobile()) {
        grid.style.gridTemplateColumns = '1fr';
      } else {
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      }
    });
  }

  /**
   * Set up touch feedback
   */
  setupTouchFeedback() {
    const touchElements = document.querySelectorAll('.btn, .nav-tab, .user-avatar, .dropdown-item');
    
    touchElements.forEach(element => {
      element.addEventListener('touchstart', (e) => {
        element.classList.add('touch-active');
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        setTimeout(() => {
          element.classList.remove('touch-active');
        }, 150);
      }, { passive: true });
      
      element.addEventListener('touchcancel', (e) => {
        element.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  /**
   * Set up swipe gestures
   */
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 0) return;
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      // Check if it's a swipe (fast movement)
      if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
        if (deltaX > 0) {
          this.handleSwipeRight();
        } else {
          this.handleSwipeLeft();
        }
      }
    }, { passive: true });
  }

  /**
   * Handle swipe right gesture
   */
  handleSwipeRight() {
    // Could be used for navigation or drawer opening
    console.log('Swipe right detected');
  }

  /**
   * Handle swipe left gesture
   */
  handleSwipeLeft() {
    // Could be used for navigation or drawer closing
    console.log('Swipe left detected');
  }

  /**
   * Set up scroll optimization
   */
  setupScrollOptimization() {
    // Use passive listeners for better performance
    const scrollElements = document.querySelectorAll('.activity-list, .jobs-list, .history-list');
    
    scrollElements.forEach(element => {
      element.addEventListener('scroll', this.throttle(() => {
        // Handle scroll events
      }, 16), { passive: true });
    });
  }

  /**
   * Set up virtual keyboard handling
   */
  setupVirtualKeyboardHandling() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        this.handleVirtualKeyboardShow(input);
      });
      
      input.addEventListener('blur', () => {
        this.handleVirtualKeyboardHide();
      });
    });
  }

  /**
   * Handle virtual keyboard show
   */
  handleVirtualKeyboardShow(input) {
    // Scroll input into view
    setTimeout(() => {
      input.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 300);
    
    // Add class to body for styling adjustments
    document.body.classList.add('keyboard-open');
  }

  /**
   * Handle virtual keyboard hide
   */
  handleVirtualKeyboardHide() {
    document.body.classList.remove('keyboard-open');
    
    // Reset viewport on iOS
    if (this.isIOS()) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  }

  /**
   * Set up tab navigation
   */
  setupTabNavigation() {
    // Improve tab order for mobile
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element, index) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }

  /**
   * Set up screen reader announcements
   */
  setupScreenReaderAnnouncements() {
    // Create announcement region
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.id = 'announcer';
    document.body.appendChild(announcer);
  }

  /**
   * Announce to screen readers
   */
  announce(message) {
    const announcer = document.getElementById('announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal-overlay:not([style*="display: none"])');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  /**
   * Trap focus within an element
   */
  trapFocus(e, container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Add skip links for mobile
   */
  addSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--accent-primary);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Optimize for mobile landscape
   */
  optimizeForMobileLandscape() {
    // Reduce header height in landscape
    const header = document.querySelector('.header');
    if (header) {
      header.style.height = '2.5rem';
    }
    
    // Adjust main content padding
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.paddingTop = '3rem';
    }
  }

  /**
   * Optimize for specific devices
   */
  optimizeForDevice() {
    // iOS specific optimizations
    if (this.isIOS()) {
      document.body.classList.add('ios-device');
      this.setupIOSOptimizations();
    }
    
    // Android specific optimizations
    if (this.isAndroid()) {
      document.body.classList.add('android-device');
      this.setupAndroidOptimizations();
    }
  }

  /**
   * Set up iOS specific optimizations
   */
  setupIOSOptimizations() {
    // Prevent zoom on input focus
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.style.fontSize === '' || parseFloat(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
    
    // Handle safe area insets
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
      document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
    }
  }

  /**
   * Set up Android specific optimizations
   */
  setupAndroidOptimizations() {
    // Handle Android keyboard behavior
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.handleAndroidKeyboard();
      });
    }
  }

  /**
   * Handle Android keyboard resize
   */
  handleAndroidKeyboard() {
    const viewport = window.visualViewport;
    const heightDifference = window.innerHeight - viewport.height;
    
    if (heightDifference > 150) {
      // Keyboard is likely open
      document.body.style.height = `${viewport.height}px`;
    } else {
      // Keyboard is likely closed
      document.body.style.height = '';
    }
  }

  /**
   * Set up dynamic viewport
   */
  setupDynamicViewport() {
    // Use CSS custom properties for dynamic viewport
    const updateViewport = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      document.documentElement.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateViewport, 100);
    });
  }

  /**
   * Adjust viewport for iOS
   */
  adjustViewportForIOS() {
    // Fix iOS viewport issues
    setTimeout(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
    }, 500);
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden (user switched tabs/apps)
      this.onPageHidden();
    } else {
      // Page is visible again
      this.onPageVisible();
    }
  }

  /**
   * Handle page hidden
   */
  onPageHidden() {
    // Pause any animations or timers
    console.log('Page hidden');
  }

  /**
   * Handle page visible
   */
  onPageVisible() {
    // Resume animations or refresh data
    console.log('Page visible');
    this.updateDynamicElements();
  }

  /**
   * Update dynamic elements
   */
  updateDynamicElements() {
    // Update any elements that depend on viewport size
    const event = new CustomEvent('dynamicUpdate');
    window.dispatchEvent(event);
  }

  /**
   * Prevent double zoom on touch
   */
  preventDoubleZoom(e) {
    const now = Date.now();
    const timeSince = now - (this.lastTouchEnd || 0);
    
    if (timeSince < 300 && timeSince > 0) {
      e.preventDefault();
    }
    
    this.lastTouchEnd = now;
  }

  /**
   * Utility functions
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width <= this.breakpoints.mobile) return 'mobile';
    if (width <= this.breakpoints.tablet) return 'tablet';
    if (width <= this.breakpoints.desktop) return 'desktop';
    return 'wide';
  }

  getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  isMobile() {
    return this.currentBreakpoint === 'mobile';
  }

  isTablet() {
    return this.currentBreakpoint === 'tablet';
  }

  isDesktop() {
    return this.currentBreakpoint === 'desktop' || this.currentBreakpoint === 'wide';
  }

  detectTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  /**
   * Throttle function for performance
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    clearTimeout(this.resizeTimeout);
    clearTimeout(this.orientationTimeout);
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    
    console.log('Responsive Manager destroyed');
  }
}

// Initialize responsive manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.responsiveManager = new ResponsiveManager();
  });
} else {
  window.responsiveManager = new ResponsiveManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveManager;
}

