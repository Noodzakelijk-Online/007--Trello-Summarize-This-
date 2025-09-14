const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const url = require('url');
const si = require('systeminformation');
const log = require('electron-log');
const Store = require('electron-store');

// Configure logging
log.transports.file.level = 'info';
log.info('Application starting...');

// Initialize settings store
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    resourceMonitoring: {
      enabled: true,
      detailsVisible: true,
      costCoefficients: {
        cpu: 0.0000004,
        memory: 0.0000002,
        summarization: {
          rule: 0.001,
          ml: 0.003,
          ai: 0.005
        },
        transcription: 0.0004,
        storage: 0.0000000001
      }
    }
  }
});

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Resource monitoring data
let resourceData = {
  cpu: 0,
  memory: 0,
  apiCalls: {
    summarization: { rule: 0, ml: 0, ai: 0 },
    transcription: { seconds: 0 },
    storage: { bytes: 0 }
  },
  startTime: Date.now()
};

// Create the browser window
function createWindow() {
  const { width, height } = store.get('windowBounds');
  
  mainWindow = new BrowserWindow({
    width,
    height,
    title: 'Summarize This',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Save window size when resized
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
  });

  // Start resource monitoring
  startResourceMonitoring();

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Create application menu
  createMenu();
}

// Create the application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            // Open settings window
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Resource Monitor',
          type: 'checkbox',
          checked: store.get('resourceMonitoring.enabled'),
          click: (menuItem) => {
            store.set('resourceMonitoring.enabled', menuItem.checked);
            mainWindow.webContents.send('toggle-resource-monitor', menuItem.checked);
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Show about dialog
            createAboutWindow();
          }
        },
        {
          label: 'View Resource Usage Report',
          click: () => {
            // Generate and show resource usage report
            createResourceReportWindow();
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create settings window
function createSettingsWindow() {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-settings.js')
    }
  });
  
  settingsWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'settings.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });
}

// Create about window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: 'About',
    parent: mainWindow,
    modal: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  aboutWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'about.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  aboutWindow.setMenu(null);
}

// Create resource report window
function createResourceReportWindow() {
  const reportWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Resource Usage Report',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-report.js')
    }
  });
  
  reportWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'report.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  // Send resource data to the report window
  reportWindow.webContents.on('did-finish-load', () => {
    reportWindow.webContents.send('resource-data', {
      resourceData,
      costCoefficients: store.get('resourceMonitoring.costCoefficients')
    });
  });
}

// Start monitoring system resources
function startResourceMonitoring() {
  // Monitor CPU usage
  setInterval(async () => {
    try {
      const cpuData = await si.currentLoad();
      resourceData.cpu = cpuData.currentLoad;
      
      // Send update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('resource-update', {
          type: 'cpu',
          value: resourceData.cpu
        });
      }
    } catch (error) {
      log.error('Error monitoring CPU:', error);
    }
  }, 2000);
  
  // Monitor memory usage
  setInterval(async () => {
    try {
      const memData = await si.mem();
      resourceData.memory = memData.active / (1024 * 1024); // Convert to MB
      
      // Send update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('resource-update', {
          type: 'memory',
          value: resourceData.memory
        });
      }
    } catch (error) {
      log.error('Error monitoring memory:', error);
    }
  }, 2000);
}

// IPC handlers for resource monitoring
ipcMain.on('track-api-call', (event, data) => {
  const { type, subtype, quantity } = data;
  
  if (type === 'summarization') {
    if (subtype === 'rule') {
      resourceData.apiCalls.summarization.rule += quantity;
    } else if (subtype === 'ml') {
      resourceData.apiCalls.summarization.ml += quantity;
    } else if (subtype === 'ai') {
      resourceData.apiCalls.summarization.ai += quantity;
    }
  } else if (type === 'transcription') {
    resourceData.apiCalls.transcription.seconds += quantity;
  }
  
  // Log the API call
  log.info(`API call tracked: ${type} ${subtype || ''} - ${quantity}`);
});

ipcMain.on('track-storage', (event, bytes) => {
  resourceData.apiCalls.storage.bytes += bytes;
  
  // Log the storage usage
  log.info(`Storage tracked: ${bytes} bytes`);
});

ipcMain.on('get-resource-data', (event) => {
  event.returnValue = {
    resourceData,
    costCoefficients: store.get('resourceMonitoring.costCoefficients')
  };
});

ipcMain.on('reset-tracking', (event) => {
  resourceData = {
    cpu: resourceData.cpu,
    memory: resourceData.memory,
    apiCalls: {
      summarization: { rule: 0, ml: 0, ai: 0 },
      transcription: { seconds: 0 },
      storage: { bytes: 0 }
    },
    startTime: Date.now()
  };
  
  log.info('Resource tracking reset');
  event.returnValue = true;
});

ipcMain.on('update-cost-coefficients', (event, coefficients) => {
  store.set('resourceMonitoring.costCoefficients', coefficients);
  log.info('Cost coefficients updated');
  event.returnValue = true;
});

// App lifecycle events
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});
