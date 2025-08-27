// Advanced Analytics Framework for Summarize This
// Privacy-compliant user behavior tracking and business intelligence

const crypto = require('crypto');
const { EventEmitter } = require('events');

// =============================================================================
// PRIVACY-COMPLIANT ANALYTICS FRAMEWORK
// =============================================================================

class AnalyticsFramework extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Privacy settings
      respectDNT: true,              // Respect Do Not Track
      anonymizeIPs: true,            // Anonymize IP addresses
      dataRetentionDays: 365,        // Data retention period
      consentRequired: true,         // Require explicit consent
      
      // Analytics providers
      providers: {
        googleAnalytics: config.googleAnalytics || null,
        mixpanel: config.mixpanel || null,
        customAnalytics: config.customAnalytics || true,
        amplitude: config.amplitude || null
      },
      
      // Tracking configuration
      trackPageViews: true,
      trackEvents: true,
      trackUserProperties: true,
      trackPerformance: true,
      trackErrors: true,
      
      // Sampling rates
      samplingRate: config.samplingRate || 1.0,
      errorSamplingRate: config.errorSamplingRate || 0.1,
      
      // Debug mode
      debug: config.debug || false,
      
      ...config
    };
    
    this.providers = new Map();
    this.userConsent = new Map();
    this.sessionData = new Map();
    this.eventQueue = [];
    this.isInitialized = false;
    
    // Initialize framework
    this.initialize();
  }
  
  // ==========================================================================
  // INITIALIZATION AND SETUP
  // ==========================================================================
  
  async initialize() {
    try {
      // Check privacy compliance
      await this.checkPrivacyCompliance();
      
      // Initialize analytics providers
      await this.initializeProviders();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start session tracking
      this.startSessionTracking();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      if (this.config.debug) {
        console.log('Analytics Framework initialized successfully');
      }
      
    } catch (error) {
      console.error('Failed to initialize Analytics Framework:', error);
      this.emit('error', error);
    }
  }
  
  async checkPrivacyCompliance() {
    // Check Do Not Track header
    if (this.config.respectDNT && this.isDNTEnabled()) {
      this.config.trackingEnabled = false;
      return;
    }
    
    // Check for required consent
    if (this.config.consentRequired) {
      const consent = await this.getStoredConsent();
      if (!consent) {
        this.config.trackingEnabled = false;
        return;
      }
    }
    
    this.config.trackingEnabled = true;
  }
  
  async initializeProviders() {
    const { providers } = this.config;
    
    // Initialize Google Analytics 4
    if (providers.googleAnalytics) {
      await this.initializeGoogleAnalytics(providers.googleAnalytics);
    }
    
    // Initialize Mixpanel
    if (providers.mixpanel) {
      await this.initializeMixpanel(providers.mixpanel);
    }
    
    // Initialize Amplitude
    if (providers.amplitude) {
      await this.initializeAmplitude(providers.amplitude);
    }
    
    // Initialize custom analytics
    if (providers.customAnalytics) {
      await this.initializeCustomAnalytics();
    }
  }
  
  // ==========================================================================
  // PROVIDER IMPLEMENTATIONS
  // ==========================================================================
  
  async initializeGoogleAnalytics(config) {
    try {
      // Load Google Analytics 4
      const gtag = await this.loadScript(`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`);
      
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      
      gtag('js', new Date());
      gtag('config', config.measurementId, {
        anonymize_ip: this.config.anonymizeIPs,
        allow_google_signals: config.allowGoogleSignals || false,
        allow_ad_personalization_signals: config.allowAdPersonalization || false,
        cookie_expires: config.cookieExpires || 63072000, // 2 years
        custom_map: config.customDimensions || {}
      });
      
      this.providers.set('googleAnalytics', {
        measurementId: config.measurementId,
        gtag: gtag,
        initialized: true
      });
      
      if (this.config.debug) {
        console.log('Google Analytics 4 initialized');
      }
      
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }
  
  async initializeMixpanel(config) {
    try {
      // Load Mixpanel
      await this.loadScript('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js');
      
      mixpanel.init(config.token, {
        api_host: config.apiHost || 'https://api.mixpanel.com',
        cross_site_cookie: false,
        secure_cookie: true,
        ip: !this.config.anonymizeIPs,
        property_blacklist: config.propertyBlacklist || [],
        debug: this.config.debug
      });
      
      this.providers.set('mixpanel', {
        token: config.token,
        mixpanel: mixpanel,
        initialized: true
      });
      
      if (this.config.debug) {
        console.log('Mixpanel initialized');
      }
      
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
    }
  }
  
  async initializeAmplitude(config) {
    try {
      // Load Amplitude
      await this.loadScript('https://cdn.amplitude.com/libs/amplitude-8.21.9-min.gz.js');
      
      amplitude.getInstance().init(config.apiKey, null, {
        includeUtm: true,
        includeReferrer: true,
        includeGclid: false,
        cookieExpiration: config.cookieExpiration || 365,
        sessionTimeout: config.sessionTimeout || 1800000, // 30 minutes
        logLevel: this.config.debug ? 'DEBUG' : 'WARN'
      });
      
      this.providers.set('amplitude', {
        apiKey: config.apiKey,
        amplitude: amplitude,
        initialized: true
      });
      
      if (this.config.debug) {
        console.log('Amplitude initialized');
      }
      
    } catch (error) {
      console.error('Failed to initialize Amplitude:', error);
    }
  }
  
  async initializeCustomAnalytics() {
    try {
      const customProvider = new CustomAnalyticsProvider({
        apiEndpoint: '/api/analytics',
        batchSize: 50,
        flushInterval: 30000, // 30 seconds
        debug: this.config.debug
      });
      
      await customProvider.initialize();
      
      this.providers.set('custom', {
        provider: customProvider,
        initialized: true
      });
      
      if (this.config.debug) {
        console.log('Custom Analytics initialized');
      }
      
    } catch (error) {
      console.error('Failed to initialize Custom Analytics:', error);
    }
  }
  
  // ==========================================================================
  // TRACKING METHODS
  // ==========================================================================
  
  track(eventName, properties = {}, options = {}) {
    if (!this.config.trackingEnabled || !this.isInitialized) {
      return;
    }
    
    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }
    
    // Enhance properties with session data
    const enhancedProperties = this.enhanceProperties(properties);
    
    // Create standardized event
    const event = {
      name: eventName,
      properties: enhancedProperties,
      timestamp: new Date().toISOString(),
      sessionId: this.getCurrentSessionId(),
      userId: this.getCurrentUserId(),
      anonymousId: this.getAnonymousId(),
      ...options
    };
    
    // Track with all providers
    this.trackWithProviders(event);
    
    // Emit event for custom handling
    this.emit('track', event);
    
    if (this.config.debug) {
      console.log('Event tracked:', event);
    }
  }
  
  page(name, properties = {}) {
    if (!this.config.trackPageViews) return;
    
    this.track('Page View', {
      page_name: name,
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      ...properties
    });
  }
  
  identify(userId, traits = {}) {
    if (!this.config.trackingEnabled) return;
    
    // Store user ID
    this.setCurrentUserId(userId);
    
    // Enhanced traits with privacy compliance
    const enhancedTraits = this.enhanceUserTraits(traits);
    
    // Identify with all providers
    this.providers.forEach((provider, name) => {
      try {
        switch (name) {
          case 'googleAnalytics':
            provider.gtag('config', provider.measurementId, {
              user_id: userId,
              custom_map: enhancedTraits
            });
            break;
            
          case 'mixpanel':
            provider.mixpanel.identify(userId);
            provider.mixpanel.people.set(enhancedTraits);
            break;
            
          case 'amplitude':
            provider.amplitude.getInstance().setUserId(userId);
            provider.amplitude.getInstance().setUserProperties(enhancedTraits);
            break;
            
          case 'custom':
            provider.provider.identify(userId, enhancedTraits);
            break;
        }
      } catch (error) {
        console.error(`Failed to identify user with ${name}:`, error);
      }
    });
    
    this.emit('identify', { userId, traits: enhancedTraits });
  }
  
  group(groupId, traits = {}) {
    if (!this.config.trackingEnabled) return;
    
    const enhancedTraits = {
      ...traits,
      group_id: groupId,
      timestamp: new Date().toISOString()
    };
    
    // Group with supported providers
    this.providers.forEach((provider, name) => {
      try {
        switch (name) {
          case 'mixpanel':
            provider.mixpanel.register({ group_id: groupId });
            break;
            
          case 'amplitude':
            provider.amplitude.getInstance().setGroup('company', groupId);
            break;
            
          case 'custom':
            provider.provider.group(groupId, enhancedTraits);
            break;
        }
      } catch (error) {
        console.error(`Failed to group user with ${name}:`, error);
      }
    });
    
    this.emit('group', { groupId, traits: enhancedTraits });
  }
  
  // ==========================================================================
  // SPECIALIZED TRACKING METHODS
  // ==========================================================================
  
  trackFeatureUsage(featureName, properties = {}) {
    this.track('Feature Used', {
      feature_name: featureName,
      feature_category: this.getFeatureCategory(featureName),
      ...properties
    });
  }
  
  trackCreditUsage(action, credits, properties = {}) {
    this.track('Credit Usage', {
      action: action,
      credits_used: credits,
      credits_remaining: properties.creditsRemaining,
      credit_type: properties.creditType || 'standard',
      ...properties
    });
  }
  
  trackError(error, context = {}) {
    if (Math.random() > this.config.errorSamplingRate) {
      return;
    }
    
    this.track('Error Occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.constructor.name,
      context: context,
      severity: context.severity || 'error'
    });
  }
  
  trackPerformance(metric, value, properties = {}) {
    if (!this.config.trackPerformance) return;
    
    this.track('Performance Metric', {
      metric_name: metric,
      metric_value: value,
      metric_unit: properties.unit || 'ms',
      ...properties
    });
  }
  
  trackConversion(event, value = 0, currency = 'USD', properties = {}) {
    this.track('Conversion', {
      conversion_event: event,
      conversion_value: value,
      currency: currency,
      ...properties
    });
    
    // Track conversion with Google Analytics
    const gaProvider = this.providers.get('googleAnalytics');
    if (gaProvider) {
      gaProvider.gtag('event', 'purchase', {
        transaction_id: properties.transactionId,
        value: value,
        currency: currency,
        items: properties.items || []
      });
    }
  }
  
  // ==========================================================================
  // PRIVACY AND CONSENT MANAGEMENT
  // ==========================================================================
  
  async requestConsent(purposes = ['analytics', 'performance']) {
    return new Promise((resolve) => {
      // Show consent dialog
      this.showConsentDialog(purposes, (granted) => {
        if (granted) {
          this.grantConsent(purposes);
          this.config.trackingEnabled = true;
          this.initialize();
        } else {
          this.config.trackingEnabled = false;
        }
        resolve(granted);
      });
    });
  }
  
  grantConsent(purposes = ['analytics']) {
    const consent = {
      granted: true,
      purposes: purposes,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    localStorage.setItem('analytics_consent', JSON.stringify(consent));
    this.userConsent.set('current', consent);
    
    // Update provider consent
    this.updateProviderConsent(consent);
    
    this.emit('consent_granted', consent);
  }
  
  revokeConsent() {
    localStorage.removeItem('analytics_consent');
    this.userConsent.clear();
    this.config.trackingEnabled = false;
    
    // Clear provider data
    this.clearProviderData();
    
    this.emit('consent_revoked');
  }
  
  getStoredConsent() {
    try {
      const stored = localStorage.getItem('analytics_consent');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
  
  updateProviderConsent(consent) {
    this.providers.forEach((provider, name) => {
      try {
        switch (name) {
          case 'googleAnalytics':
            provider.gtag('consent', 'update', {
              analytics_storage: consent.granted ? 'granted' : 'denied',
              ad_storage: 'denied' // Always deny ad storage for privacy
            });
            break;
            
          case 'mixpanel':
            if (!consent.granted) {
              provider.mixpanel.opt_out_tracking();
            } else {
              provider.mixpanel.opt_in_tracking();
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to update consent for ${name}:`, error);
      }
    });
  }
  
  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  
  startSessionTracking() {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      pageViews: 0,
      events: 0,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    this.sessionData.set('current', session);
    
    // Track session start
    this.track('Session Started', {
      session_id: sessionId,
      referrer: session.referrer,
      viewport_width: session.viewport.width,
      viewport_height: session.viewport.height
    });
    
    // Set up session timeout
    this.setupSessionTimeout();
  }
  
  updateSessionActivity() {
    const session = this.sessionData.get('current');
    if (session) {
      session.lastActivity = new Date().toISOString();
      session.events++;
    }
  }
  
  setupSessionTimeout() {
    // End session after 30 minutes of inactivity
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    let timeoutId;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.endSession();
      }, TIMEOUT);
    };
    
    // Reset timeout on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });
    
    resetTimeout();
  }
  
  endSession() {
    const session = this.sessionData.get('current');
    if (session) {
      const duration = new Date() - new Date(session.startTime);
      
      this.track('Session Ended', {
        session_id: session.id,
        session_duration: duration,
        page_views: session.pageViews,
        events: session.events
      });
      
      this.sessionData.delete('current');
    }
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  enhanceProperties(properties) {
    const session = this.sessionData.get('current');
    
    return {
      ...properties,
      // Session context
      session_id: session?.id,
      
      // Page context
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      
      // Device context
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      
      // Performance context
      connection_type: navigator.connection?.effectiveType,
      
      // Privacy-compliant timestamp
      timestamp: new Date().toISOString()
    };
  }
  
  enhanceUserTraits(traits) {
    // Remove PII and enhance with allowed traits
    const allowedTraits = {};
    
    // Copy non-PII traits
    Object.keys(traits).forEach(key => {
      if (!this.isPII(key, traits[key])) {
        allowedTraits[key] = traits[key];
      }
    });
    
    return {
      ...allowedTraits,
      last_seen: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }
  
  isPII(key, value) {
    const piiKeys = ['email', 'phone', 'address', 'ssn', 'credit_card'];
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ // Credit card
    ];
    
    // Check key names
    if (piiKeys.some(piiKey => key.toLowerCase().includes(piiKey))) {
      return true;
    }
    
    // Check value patterns
    if (typeof value === 'string') {
      return piiPatterns.some(pattern => pattern.test(value));
    }
    
    return false;
  }
  
  getFeatureCategory(featureName) {
    const categories = {
      'summarize': 'AI Processing',
      'transcribe': 'AI Processing',
      'upload': 'File Management',
      'download': 'File Management',
      'settings': 'User Management',
      'billing': 'Payment',
      'dashboard': 'Navigation'
    };
    
    return categories[featureName.toLowerCase()] || 'Other';
  }
  
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  getCurrentSessionId() {
    return this.sessionData.get('current')?.id;
  }
  
  getCurrentUserId() {
    return localStorage.getItem('user_id');
  }
  
  setCurrentUserId(userId) {
    localStorage.setItem('user_id', userId);
  }
  
  getAnonymousId() {
    let anonymousId = localStorage.getItem('anonymous_id');
    if (!anonymousId) {
      anonymousId = crypto.randomBytes(16).toString('hex');
      localStorage.setItem('anonymous_id', anonymousId);
    }
    return anonymousId;
  }
  
  isDNTEnabled() {
    return navigator.doNotTrack === '1' || 
           navigator.doNotTrack === 'yes' || 
           navigator.msDoNotTrack === '1';
  }
  
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  trackWithProviders(event) {
    this.providers.forEach((provider, name) => {
      try {
        switch (name) {
          case 'googleAnalytics':
            provider.gtag('event', event.name.toLowerCase().replace(/\s+/g, '_'), {
              event_category: event.properties.category || 'engagement',
              event_label: event.properties.label,
              value: event.properties.value,
              custom_parameters: event.properties
            });
            break;
            
          case 'mixpanel':
            provider.mixpanel.track(event.name, event.properties);
            break;
            
          case 'amplitude':
            provider.amplitude.getInstance().logEvent(event.name, event.properties);
            break;
            
          case 'custom':
            provider.provider.track(event);
            break;
        }
      } catch (error) {
        console.error(`Failed to track event with ${name}:`, error);
      }
    });
  }
  
  showConsentDialog(purposes, callback) {
    // Create consent dialog
    const dialog = document.createElement('div');
    dialog.className = 'analytics-consent-dialog';
    dialog.innerHTML = `
      <div class="consent-content">
        <h3>Privacy Consent</h3>
        <p>We use analytics to improve your experience. We respect your privacy and will only collect anonymized data.</p>
        <ul>
          ${purposes.map(purpose => `<li>${purpose.charAt(0).toUpperCase() + purpose.slice(1)} tracking</li>`).join('')}
        </ul>
        <div class="consent-buttons">
          <button id="consent-accept">Accept</button>
          <button id="consent-decline">Decline</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .analytics-consent-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .consent-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 400px;
        text-align: center;
      }
      .consent-buttons {
        margin-top: 20px;
      }
      .consent-buttons button {
        margin: 0 10px;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      #consent-accept {
        background: #007bff;
        color: white;
      }
      #consent-decline {
        background: #6c757d;
        color: white;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
    
    // Handle button clicks
    document.getElementById('consent-accept').onclick = () => {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
      callback(true);
    };
    
    document.getElementById('consent-decline').onclick = () => {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
      callback(false);
    };
  }
  
  clearProviderData() {
    this.providers.forEach((provider, name) => {
      try {
        switch (name) {
          case 'mixpanel':
            provider.mixpanel.reset();
            break;
            
          case 'amplitude':
            provider.amplitude.getInstance().setUserId(null);
            provider.amplitude.getInstance().regenerateDeviceId();
            break;
            
          case 'custom':
            provider.provider.reset();
            break;
        }
      } catch (error) {
        console.error(`Failed to clear data for ${name}:`, error);
      }
    });
  }
}

// =============================================================================
// CUSTOM ANALYTICS PROVIDER
// =============================================================================

class CustomAnalyticsProvider {
  constructor(config) {
    this.config = config;
    this.eventQueue = [];
    this.isOnline = navigator.onLine;
    this.flushTimer = null;
  }
  
  async initialize() {
    // Set up online/offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Start flush timer
    this.startFlushTimer();
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }
  
  track(event) {
    this.eventQueue.push({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  identify(userId, traits) {
    this.track({
      type: 'identify',
      userId: userId,
      traits: traits
    });
  }
  
  group(groupId, traits) {
    this.track({
      type: 'group',
      groupId: groupId,
      traits: traits
    });
  }
  
  async flush(sync = false) {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }
    
    const events = this.eventQueue.splice(0, this.config.batchSize);
    
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events }),
        keepalive: sync
      });
      
      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
      }
      
    } catch (error) {
      // Re-queue events on error
      this.eventQueue.unshift(...events);
      
      if (this.config.debug) {
        console.error('Failed to send analytics events:', error);
      }
    }
  }
  
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  reset() {
    this.eventQueue = [];
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.startFlushTimer();
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  AnalyticsFramework,
  CustomAnalyticsProvider
};

