/**
 * Enhanced Preload Script
 * 
 * Provides secure IPC communication between main and renderer processes
 * with comprehensive API for resource monitoring and application features.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System Information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Resource Monitoring
  getResourceData: () => ipcRenderer.invoke('get-resource-data'),
  startResourceMonitoring: () => ipcRenderer.invoke('start-resource-monitoring'),
  stopResourceMonitoring: () => ipcRenderer.invoke('stop-resource-monitoring'),
  trackApiCall: (service, operation, cost, metadata) => 
    ipcRenderer.invoke('track-api-call', service, operation, cost, metadata),

  // Resource Monitoring Events
  onResourceMetricsUpdated: (callback) => {
    ipcRenderer.on('resource-metrics-updated', (event, data) => callback(data));
  },
  onResourceCostsUpdated: (callback) => {
    ipcRenderer.on('resource-costs-updated', (event, data) => callback(data));
  },
  onResourceMonitoringStarted: (callback) => {
    ipcRenderer.on('resource-monitoring-started', callback);
  },
  onResourceMonitoringStopped: (callback) => {
    ipcRenderer.on('resource-monitoring-stopped', callback);
  },

  // File Operations
  onFilesSelected: (callback) => {
    ipcRenderer.on('files-selected', (event, filePaths) => callback(filePaths));
  },
  onSaveResultsRequested: (callback) => {
    ipcRenderer.on('save-results-requested', callback);
  },
  saveFile: (content, defaultPath) => ipcRenderer.invoke('save-file', content, defaultPath),

  // Application Events
  onNewProject: (callback) => {
    ipcRenderer.on('new-project', callback);
  },
  onShowSettings: (callback) => {
    ipcRenderer.on('show-settings', callback);
  },
  onShowDocumentation: (callback) => {
    ipcRenderer.on('show-documentation', callback);
  },

  // Server Management
  onLocalServerStarted: (callback) => {
    ipcRenderer.on('local-server-started', callback);
  },
  onLocalServerStopped: (callback) => {
    ipcRenderer.on('local-server-stopped', callback);
  },

  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  setPreference: (key, value) => ipcRenderer.invoke('set-preference', key, value),

  // Window Management
  showResourceDashboard: () => ipcRenderer.invoke('show-resource-dashboard'),

  // Export
  exportResourceData: (format) => ipcRenderer.invoke('export-resource-data', format),

  // Notifications
  onShowNotification: (callback) => {
    ipcRenderer.on('show-notification', (event, notification) => callback(notification));
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose a secure API for the summarization and transcription features
contextBridge.exposeInMainWorld('summaryAPI', {
  // Text Summarization
  summarizeText: (text, method, options) => 
    ipcRenderer.invoke('summarize-text', text, method, options),
  
  // Audio/Video Transcription
  transcribeFile: (filePath, service, options) => 
    ipcRenderer.invoke('transcribe-file', filePath, service, options),
  
  // Get available methods and services
  getSummarizationMethods: () => ipcRenderer.invoke('get-summarization-methods'),
  getTranscriptionServices: () => ipcRenderer.invoke('get-transcription-services'),
  
  // Cost estimation
  estimateSummarizationCost: (text, method) => 
    ipcRenderer.invoke('estimate-summarization-cost', text, method),
  estimateTranscriptionCost: (filePath, service) => 
    ipcRenderer.invoke('estimate-transcription-cost', filePath, service)
});

// Expose resource monitoring utilities
contextBridge.exposeInMainWorld('resourceMonitor', {
  // Current resource usage
  getCurrentUsage: () => ipcRenderer.invoke('get-current-resource-usage'),
  getCurrentCosts: () => ipcRenderer.invoke('get-current-resource-costs'),
  
  // Historical data
  getResourceHistory: (timeRange) => ipcRenderer.invoke('get-resource-history', timeRange),
  getCostHistory: (timeRange) => ipcRenderer.invoke('get-cost-history', timeRange),
  
  // Configuration
  updateMonitoringSettings: (settings) => 
    ipcRenderer.invoke('update-monitoring-settings', settings),
  updateCostCoefficients: (coefficients) => 
    ipcRenderer.invoke('update-cost-coefficients', coefficients),
  
  // Alerts
  setAlertThresholds: (thresholds) => 
    ipcRenderer.invoke('set-alert-thresholds', thresholds),
  
  // Data export/import
  exportMonitoringData: () => ipcRenderer.invoke('export-monitoring-data'),
  importMonitoringData: (data) => ipcRenderer.invoke('import-monitoring-data', data),
  
  // Reset and cleanup
  resetMonitoringData: () => ipcRenderer.invoke('reset-monitoring-data'),
  clearHistory: () => ipcRenderer.invoke('clear-monitoring-history')
});

// Expose utility functions
contextBridge.exposeInMainWorld('utils', {
  // Format utilities
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  formatCurrency: (amount, currency = 'USD', decimals = 4) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  },
  
  formatDuration: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  },
  
  formatPercentage: (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  },
  
  // Date utilities
  formatTimestamp: (timestamp, format = 'full') => {
    const date = new Date(timestamp);
    
    switch (format) {
      case 'time':
        return date.toLocaleTimeString();
      case 'date':
        return date.toLocaleDateString();
      case 'short':
        return date.toLocaleString(undefined, {
          year: '2-digit',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'full':
      default:
        return date.toLocaleString();
    }
  },
  
  // Validation utilities
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // File utilities
  getFileExtension: (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },
  
  isAudioFile: (filename) => {
    const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'];
    const ext = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    return audioExtensions.includes(ext);
  },
  
  isVideoFile: (filename) => {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    const ext = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    return videoExtensions.includes(ext);
  },
  
  isTextFile: (filename) => {
    const textExtensions = ['txt', 'md', 'rtf', 'doc', 'docx', 'pdf'];
    const ext = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    return textExtensions.includes(ext);
  },
  
  // Math utilities
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  
  lerp: (start, end, factor) => start + (end - start) * factor,
  
  roundTo: (value, decimals) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
  
  // Array utilities
  average: (array) => array.reduce((sum, val) => sum + val, 0) / array.length,
  
  sum: (array) => array.reduce((sum, val) => sum + val, 0),
  
  max: (array) => Math.max(...array),
  
  min: (array) => Math.min(...array),
  
  // Color utilities
  getStatusColor: (percentage, thresholds = { warning: 70, critical: 85 }) => {
    if (percentage >= thresholds.critical) return '#e74c3c'; // Red
    if (percentage >= thresholds.warning) return '#f39c12';  // Orange
    return '#27ae60'; // Green
  },
  
  hexToRgba: (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
});

// Expose theme and UI utilities
contextBridge.exposeInMainWorld('themeAPI', {
  // Theme management
  getCurrentTheme: () => ipcRenderer.invoke('get-current-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  
  // Theme change events
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
  },
  
  // System theme detection
  getSystemTheme: () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  
  // Watch for system theme changes
  watchSystemTheme: (callback) => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        callback(e.matches ? 'dark' : 'light');
      });
    }
  }
});

// Expose logging utilities
contextBridge.exposeInMainWorld('logger', {
  info: (message, data) => ipcRenderer.invoke('log', 'info', message, data),
  warn: (message, data) => ipcRenderer.invoke('log', 'warn', message, data),
  error: (message, data) => ipcRenderer.invoke('log', 'error', message, data),
  debug: (message, data) => ipcRenderer.invoke('log', 'debug', message, data)
});

// Performance monitoring for the renderer process
contextBridge.exposeInMainWorld('performance', {
  // Mark performance events
  mark: (name) => {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
  },
  
  // Measure performance between marks
  measure: (name, startMark, endMark) => {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
        const entries = window.performance.getEntriesByName(name);
        return entries.length > 0 ? entries[entries.length - 1].duration : 0;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return 0;
      }
    }
    return 0;
  },
  
  // Get memory usage (if available)
  getMemoryUsage: () => {
    if (window.performance && window.performance.memory) {
      return {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },
  
  // Clear performance entries
  clearMarks: (name) => {
    if (window.performance && window.performance.clearMarks) {
      window.performance.clearMarks(name);
    }
  },
  
  clearMeasures: (name) => {
    if (window.performance && window.performance.clearMeasures) {
      window.performance.clearMeasures(name);
    }
  }
});

// Security utilities
contextBridge.exposeInMainWorld('security', {
  // Sanitize HTML content
  sanitizeHTML: (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },
  
  // Validate input
  validateInput: (input, type) => {
    switch (type) {
      case 'number':
        return !isNaN(parseFloat(input)) && isFinite(input);
      case 'integer':
        return Number.isInteger(Number(input));
      case 'positive':
        return !isNaN(parseFloat(input)) && parseFloat(input) > 0;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      case 'url':
        try {
          new URL(input);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }
});

// Development utilities (only available in development mode)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    // Console utilities
    log: (...args) => console.log('[Renderer]', ...args),
    warn: (...args) => console.warn('[Renderer]', ...args),
    error: (...args) => console.error('[Renderer]', ...args),
    
    // Performance profiling
    profile: (name) => {
      if (console.profile) console.profile(name);
    },
    
    profileEnd: (name) => {
      if (console.profileEnd) console.profileEnd(name);
    },
    
    // Memory monitoring
    logMemoryUsage: () => {
      const memory = window.performance?.memory;
      if (memory) {
        console.log('[Memory]', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      }
    }
  });
}

// Initialize performance monitoring
window.addEventListener('DOMContentLoaded', () => {
  if (window.performance && window.performance.mark) {
    window.performance.mark('dom-content-loaded');
  }
});

window.addEventListener('load', () => {
  if (window.performance && window.performance.mark) {
    window.performance.mark('window-loaded');
    
    // Measure page load time
    try {
      window.performance.measure('page-load-time', 'dom-content-loaded', 'window-loaded');
      const loadTime = window.performance.getEntriesByName('page-load-time')[0];
      if (loadTime) {
        console.log(`Page loaded in ${loadTime.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn('Could not measure page load time:', error);
    }
  }
});

// Handle unhandled errors
window.addEventListener('error', (event) => {
  ipcRenderer.invoke('log', 'error', 'Unhandled renderer error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ipcRenderer.invoke('log', 'error', 'Unhandled promise rejection', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

console.log('Enhanced preload script loaded successfully');

