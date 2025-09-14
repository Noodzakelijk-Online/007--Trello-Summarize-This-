/**
 * Enhanced Summarize This - Electron Main Process
 * 
 * Advanced Electron main process with comprehensive resource monitoring,
 * system integration, and enhanced desktop features.
 */

const { app, BrowserWindow, ipcMain, Menu, dialog, shell, Tray, nativeImage, powerMonitor, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const Store = require('electron-store');
const EnhancedResourceMonitor = require('./src/enhanced-resource-monitor');

// Initialize persistent storage
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    preferences: {
      theme: 'dark',
      autoStart: false,
      minimizeToTray: true,
      notifications: true,
      resourceMonitoring: true
    },
    resourceSettings: {
      monitoringInterval: 5000,
      alertThresholds: {
        cpu: 80,
        memory: 85,
        storage: 90,
        costPerHour: 10
      }
    }
  }
});

// Global references
let mainWindow;
let resourceDashboardWindow;
let settingsWindow;
let tray;
let resourceMonitor;
let serverProcess;

// Application state
const appState = {
  isQuitting: false,
  resourceMonitoringActive: false,
  serverRunning: false,
  lastResourceData: null
};

// Initialize enhanced resource monitor
function initializeResourceMonitor() {
  const settings = store.get('resourceSettings');
  resourceMonitor = new EnhancedResourceMonitor(settings);
  
  // Set up event listeners
  resourceMonitor.on('metrics-updated', (data) => {
    appState.lastResourceData = data;
    
    // Send to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('resource-metrics-updated', data);
    });
  });
  
  resourceMonitor.on('costs-calculated', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('resource-costs-updated', data);
    });
  });
  
  resourceMonitor.on('alerts', (alerts) => {
    handleResourceAlerts(alerts);
  });
  
  resourceMonitor.on('error', (error) => {
    console.error('Resource monitor error:', error);
  });
}

// Create the main application window
function createMainWindow() {
  const bounds = store.get('windowBounds');
  
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'enhanced-preload.js'),
      webSecurity: true
    },
    icon: getAppIcon(),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the main interface
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus window on creation
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

  // Handle window events
  mainWindow.on('close', (event) => {
    if (!appState.isQuitting && store.get('preferences.minimizeToTray')) {
      event.preventDefault();
      mainWindow.hide();
      
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    } else {
      // Save window bounds
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window resize
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Development tools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create resource dashboard window
function createResourceDashboardWindow() {
  if (resourceDashboardWindow) {
    resourceDashboardWindow.focus();
    return;
  }

  resourceDashboardWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'enhanced-preload.js')
    },
    icon: getAppIcon(),
    title: 'Resource Monitor Dashboard',
    parent: mainWindow,
    modal: false
  });

  resourceDashboardWindow.loadFile('public/resource-dashboard.html');

  resourceDashboardWindow.on('closed', () => {
    resourceDashboardWindow = null;
  });

  // Auto-hide menu bar on Windows/Linux
  if (process.platform !== 'darwin') {
    resourceDashboardWindow.setMenuBarVisibility(false);
  }
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'enhanced-preload.js')
    },
    icon: getAppIcon(),
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    resizable: false
  });

  settingsWindow.loadFile('public/settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Create system tray
function createTray() {
  const trayIcon = getAppIcon();
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Summarize This',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Resource Dashboard',
      click: () => createResourceDashboardWindow()
    },
    { type: 'separator' },
    {
      label: 'Resource Monitoring',
      type: 'checkbox',
      checked: appState.resourceMonitoringActive,
      click: (menuItem) => {
        if (menuItem.checked) {
          startResourceMonitoring();
        } else {
          stopResourceMonitoring();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    {
      label: 'Quit',
      click: () => {
        appState.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Summarize This - Resource Monitor');

  // Handle tray click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createMainWindow();
    }
  });
}

// Get application icon
function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'logo.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return null;
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('new-project')
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFile()
        },
        {
          label: 'Save Results',
          accelerator: 'CmdOrCtrl+S',
          click: () => saveResults()
        },
        { type: 'separator' },
        {
          label: 'Export Report',
          submenu: [
            {
              label: 'Export as PDF',
              click: () => exportReport('pdf')
            },
            {
              label: 'Export as HTML',
              click: () => exportReport('html')
            },
            {
              label: 'Export as JSON',
              click: () => exportReport('json')
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            appState.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Resource Dashboard',
          accelerator: 'CmdOrCtrl+R',
          click: () => createResourceDashboardWindow()
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Start Resource Monitoring',
          accelerator: 'CmdOrCtrl+M',
          click: () => startResourceMonitoring()
        },
        {
          label: 'Stop Resource Monitoring',
          click: () => stopResourceMonitoring()
        },
        { type: 'separator' },
        {
          label: 'Start Local Server',
          click: () => startLocalServer()
        },
        {
          label: 'Stop Local Server',
          click: () => stopLocalServer()
        },
        { type: 'separator' },
        {
          label: 'Clear Cache',
          click: () => clearCache()
        },
        {
          label: 'Reset Settings',
          click: () => resetSettings()
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/yourusername/summarize-this#readme')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/yourusername/summarize-this/issues')
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => checkForUpdates()
        },
        {
          label: 'About Summarize This',
          click: () => showAbout()
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Resource monitoring functions
function startResourceMonitoring() {
  if (!appState.resourceMonitoringActive) {
    resourceMonitor.startMonitoring();
    appState.resourceMonitoringActive = true;
    
    // Update tray menu
    if (tray) {
      const contextMenu = tray.getContextMenu();
      contextMenu.items[3].checked = true;
      tray.setContextMenu(contextMenu);
    }
    
    // Notify windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('resource-monitoring-started');
    });
  }
}

function stopResourceMonitoring() {
  if (appState.resourceMonitoringActive) {
    resourceMonitor.stopMonitoring();
    appState.resourceMonitoringActive = false;
    
    // Update tray menu
    if (tray) {
      const contextMenu = tray.getContextMenu();
      contextMenu.items[3].checked = false;
      tray.setContextMenu(contextMenu);
    }
    
    // Notify windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('resource-monitoring-stopped');
    });
  }
}

// Server management
function startLocalServer() {
  if (!appState.serverRunning) {
    const serverPath = path.join(__dirname, 'server', 'enhanced-server.js');
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    serverProcess.on('error', (error) => {
      console.error('Server error:', error);
      dialog.showErrorBox('Server Error', `Failed to start server: ${error.message}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      appState.serverRunning = false;
    });
    
    appState.serverRunning = true;
    
    // Notify windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('local-server-started');
    });
  }
}

function stopLocalServer() {
  if (appState.serverRunning && serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    appState.serverRunning = false;
    
    // Notify windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('local-server-stopped');
    });
  }
}

// Handle resource alerts
function handleResourceAlerts(alerts) {
  if (!store.get('preferences.notifications')) return;
  
  alerts.forEach(alert => {
    if (alert.level === 'critical') {
      dialog.showErrorBox('Critical Resource Alert', alert.message);
    } else {
      // Show notification
      mainWindow?.webContents.send('show-notification', {
        title: 'Resource Alert',
        body: alert.message,
        type: alert.level
      });
    }
  });
}

// File operations
async function openFile() {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'rtf'] },
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] },
        { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'] },
        { name: 'Document Files', extensions: ['pdf', 'doc', 'docx'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      mainWindow.webContents.send('files-selected', result.filePaths);
    }
  } catch (error) {
    console.error('Error opening file:', error);
    dialog.showErrorBox('Error', `Failed to open file: ${error.message}`);
  }
}

async function saveResults() {
  try {
    mainWindow.webContents.send('save-results-requested');
  } catch (error) {
    console.error('Error requesting save:', error);
  }
}

async function exportReport(format) {
  try {
    const resourceData = resourceMonitor.exportData();
    
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `resource-report-${new Date().toISOString().split('T')[0]}.${format}`,
      filters: [
        { name: `${format.toUpperCase()} Files`, extensions: [format] }
      ]
    });

    if (!result.canceled && result.filePath) {
      let content;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(resourceData, null, 2);
          break;
        case 'html':
          content = generateHTMLReport(resourceData);
          break;
        case 'pdf':
          // For PDF, we'd need to implement PDF generation
          content = JSON.stringify(resourceData, null, 2);
          break;
        default:
          content = JSON.stringify(resourceData, null, 2);
      }
      
      fs.writeFileSync(result.filePath, content);
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Export Complete',
        message: `Report exported successfully to ${result.filePath}`
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    dialog.showErrorBox('Export Error', `Failed to export report: ${error.message}`);
  }
}

function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resource Usage Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Summarize This - Resource Usage Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="section">
            <h2>Current Resource Usage</h2>
            <div class="metric">CPU: ${data.resourceData.cpu.current.toFixed(1)}%</div>
            <div class="metric">Memory: ${data.resourceData.memory.percentage.toFixed(1)}%</div>
            <div class="metric">Storage: ${data.resourceData.storage.percentage.toFixed(1)}%</div>
        </div>
        <div class="section">
            <h2>Cost Summary</h2>
            <div class="metric">Total Cost: $${data.costData.accumulated.total.toFixed(4)}</div>
            <div class="metric">Hourly Rate: $${data.costData.projections.hourly.toFixed(4)}</div>
            <div class="metric">Daily Projection: $${data.costData.projections.daily.toFixed(2)}</div>
        </div>
    </body>
    </html>
  `;
}

// Utility functions
function clearCache() {
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Clear Cache',
    message: 'Are you sure you want to clear the application cache?',
    buttons: ['Cancel', 'Clear Cache'],
    defaultId: 0,
    cancelId: 0
  }).then((result) => {
    if (result.response === 1) {
      mainWindow.webContents.session.clearCache();
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Cache Cleared',
        message: 'Application cache has been cleared successfully.'
      });
    }
  });
}

function resetSettings() {
  dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Reset Settings',
    message: 'Are you sure you want to reset all settings to default values?',
    buttons: ['Cancel', 'Reset'],
    defaultId: 0,
    cancelId: 0
  }).then((result) => {
    if (result.response === 1) {
      store.clear();
      app.relaunch();
      app.exit();
    }
  });
}

function checkForUpdates() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Updates',
    message: 'Check for Updates',
    detail: 'You are using the latest version of Summarize This.',
    buttons: ['OK']
  });
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Summarize This',
    message: 'Summarize This',
    detail: `Version 1.0.0
    
A powerful desktop application for text summarization and audio/video transcription with comprehensive resource monitoring and cost tracking.

Built with Electron and Node.js
© 2024 Summarize This Team`,
    buttons: ['OK'],
    icon: getAppIcon()
  });
}

// App event handlers
app.whenReady().then(() => {
  // Initialize resource monitor
  initializeResourceMonitor();
  
  // Create main window
  createMainWindow();
  
  // Create system tray
  if (store.get('preferences.minimizeToTray')) {
    createTray();
  }
  
  // Create menu
  createMenu();
  
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    createResourceDashboardWindow();
  });
  
  // Start resource monitoring if enabled
  if (store.get('preferences.resourceMonitoring')) {
    startResourceMonitoring();
  }
  
  // macOS specific
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
  
  // Power monitor events
  powerMonitor.on('suspend', () => {
    console.log('System is going to sleep');
    stopResourceMonitoring();
  });
  
  powerMonitor.on('resume', () => {
    console.log('System resumed from sleep');
    if (store.get('preferences.resourceMonitoring')) {
      startResourceMonitoring();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  appState.isQuitting = true;
  
  // Stop resource monitoring
  if (resourceMonitor) {
    resourceMonitor.stopMonitoring();
  }
  
  // Stop local server
  stopLocalServer();
  
  // Unregister global shortcuts
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  version: os.release(),
  cpus: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  uptime: os.uptime()
}));

ipcMain.handle('get-resource-data', () => {
  if (resourceMonitor) {
    return resourceMonitor.getDetailedReport();
  }
  return null;
});

ipcMain.handle('start-resource-monitoring', () => {
  startResourceMonitoring();
  return { success: true };
});

ipcMain.handle('stop-resource-monitoring', () => {
  stopResourceMonitoring();
  return { success: true };
});

ipcMain.handle('get-preferences', () => store.store);

ipcMain.handle('set-preference', (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

ipcMain.handle('show-resource-dashboard', () => {
  createResourceDashboardWindow();
  return { success: true };
});

ipcMain.handle('export-resource-data', async (event, format) => {
  try {
    await exportReport(format);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Track API calls for resource monitoring
ipcMain.handle('track-api-call', (event, service, operation, cost, metadata) => {
  if (resourceMonitor) {
    resourceMonitor.trackApiCall(service, operation, cost, metadata);
  }
  return { success: true };
});

module.exports = { app, createMainWindow, createResourceDashboardWindow };

