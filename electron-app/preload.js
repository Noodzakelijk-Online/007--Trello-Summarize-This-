const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Resource monitoring
    trackApiCall: (type, subtype, quantity = 1) => {
      ipcRenderer.send('track-api-call', { type, subtype, quantity });
    },
    trackStorage: (bytes) => {
      ipcRenderer.send('track-storage', bytes);
    },
    getResourceData: () => {
      return ipcRenderer.sendSync('get-resource-data');
    },
    resetTracking: () => {
      return ipcRenderer.sendSync('reset-tracking');
    },
    updateCostCoefficients: (coefficients) => {
      return ipcRenderer.sendSync('update-cost-coefficients', coefficients);
    },
    
    // Event listeners
    onResourceUpdate: (callback) => {
      ipcRenderer.on('resource-update', (event, data) => callback(data));
    },
    onToggleResourceMonitor: (callback) => {
      ipcRenderer.on('toggle-resource-monitor', (event, enabled) => callback(enabled));
    }
  }
);
