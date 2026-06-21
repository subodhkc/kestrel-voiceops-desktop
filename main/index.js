/**
 * Kestrel VoiceOps Desktop - Main Process
 * 
 * This is the Electron main process entry point.
 * Responsibilities:
 * - Application lifecycle (ready, quit, window-all-closed)
 * - Window management (creation, bounds persistence, tray integration)
 * - Single-instance enforcement
 * - Custom protocol registration (kestrel://)
 * - IPC communication with renderer process
 * - System event handling (sleep/wake, power monitor)
 * 
 * Security Principles:
 * - No nodeIntegration in renderer
 * - All renderer ↔ main communication via IPC
 * - preload script exposes safe APIs to renderer
 * - Context isolation enabled
 */

const { app, BrowserWindow, ipcMain, protocol, Tray, Menu, nativeImage, powerMonitor, Notification, globalShortcut } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const https = require('https');
const fs = require('fs');

// Single-instance lock to prevent multiple app instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[MAIN] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

// Initialize persistent store for app state
const store = new Store({
  name: 'kestrel-desktop-state',
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    isMaximized: false,
    firstRun: true,
  },
});

let mainWindow = null;
let tray = null;

/**
 * Create the main application window
 * 
 * Window configuration includes:
 * - Context isolation for security
 * - No nodeIntegration (renderer has no direct Node access)
 * - Preload script for safe IPC bridge
 * - Persisted window bounds from previous session
 */
function createWindow() {
  const bounds = store.get('windowBounds');
  const isMaximized = store.get('isMaximized', false);

  mainWindow = new BrowserWindow({
    width: bounds.width || 1200,
    height: bounds.height || 800,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // Security: Disable node integration
      nodeIntegration: false,
      // Security: Enable context isolation
      contextIsolation: true,
      // Security: Preload script for safe IPC
      preload: path.join(__dirname, 'preload.js'),
      // Security: Allow only necessary permissions
      sandbox: false, // Required for some features, consider enabling in V2
    },
    icon: path.join(__dirname, '../resources/icon.png'),
    show: false, // Don't show until ready-to-show
  });

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
  }

  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    if (isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  // Persist window bounds on change
  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);
  mainWindow.on('maximize', () => store.set('isMaximized', true));
  mainWindow.on('unmaximize', () => store.set('isMaximized', false));

  // Handle external links (open in system browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

/**
 * Save current window bounds to persistent store
 */
function saveWindowBounds() {
  if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) {
    return;
  }
  
  const bounds = mainWindow.getBounds();
  store.set('windowBounds', bounds);
}

/**
 * Create system tray icon with context menu
 */
function createTray() {
  // Tray icon would be loaded from resources
  const iconPath = path.join(__dirname, '../resources/tray-icon.png');
  
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath));
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Kestrel', click: () => mainWindow.show() },
      { label: 'Hide Kestrel', click: () => mainWindow.hide() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    
    tray.setToolTip('Kestrel VoiceOps');
    tray.setContextMenu(contextMenu);
    
    // Double-click to show/hide window
    tray.on('double-click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    });
  } catch (error) {
    console.warn('[MAIN] Failed to create tray icon:', error);
    // Continue without tray if icon is missing (dev environment)
  }
}

/**
 * Register custom protocol handler (kestrel://)
 * 
 * Used for:
 * - Auth callbacks from browser (kestrel://auth/callback?token=...)
 * - Deep links from external apps (kestrel://call?phone=...)
 * - Recording playback (kestrel://recording/{id}?token=...)
 */
function registerProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'kestrel',
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
      },
    },
  ]);
  
  // Register protocol handler for recording playback
  protocol.handle('kestrel', async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;
    
    logger.info('Custom protocol invoked', { pathname });
    
    // Handle recording playback
    if (pathname.startsWith('/recording/')) {
      const recordingId = pathname.split('/')[2];
      return handleRecordingPlayback(recordingId, searchParams);
    }
    
    return new Response('Protocol handled', { status: 200 });
  });
}

/**
 * Handle custom protocol URLs
 */
function handleProtocol(url) {
  console.log('[MAIN] Protocol URL received:', url);
  
  if (url.startsWith('kestrel://auth/callback')) {
    // Parse auth callback and send to renderer
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    const error = urlObj.searchParams.get('error');
    
    if (mainWindow) {
      mainWindow.webContents.send('auth-callback', { token, error });
      mainWindow.show();
    }
  } else if (url.startsWith('kestrel://call')) {
    // Handle call deep link
    const urlObj = new URL(url);
    const phone = urlObj.searchParams.get('phone');
    
    if (mainWindow) {
      mainWindow.webContents.send('call-deep-link', { phone });
      mainWindow.show();
    }
  }
}

/**
 * Handle recording playback through custom protocol
 * Proxies recording requests to backend with auth headers
 */
function handleRecordingPlayback(recordingId, searchParams) {
  return new Promise((resolve) => {
    const token = searchParams.get('token');
    const tenantId = searchParams.get('tenantId');
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://app.kestrel.com';
    
    if (!token) {
      resolve(new Response('Missing auth token', { status: 401 }));
      return;
    }
    
    const recordingUrl = `${apiBaseUrl}/api/recordings/${recordingId}/download`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId || '',
      },
    };
    
    const protocol = recordingUrl.startsWith('https') ? https : http;
    
    const req = protocol.request(recordingUrl, options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        const headers = new Headers();
        headers.set('Content-Type', res.headers['content-type'] || 'audio/mpeg');
        headers.set('Content-Length', buffer.length.toString());
        
        resolve(new Response(buffer, { headers }));
      });
    });
    
    req.on('error', (error) => {
      logger.error('Recording playback proxy error', error);
      resolve(new Response('Failed to fetch recording', { status: 500 }));
    });
    
    req.end();
  });
}

/**
 * Setup power monitor for sleep/wake events
 * 
 * When system wakes from sleep:
 * - Re-establish Supabase realtime connections
 * - Re-register Twilio device if needed
 * - Show "Reconnecting..." status to user
 */
function setupPowerMonitor() {
  powerMonitor.on('resume', () => {
    console.log('[MAIN] System resumed from sleep');
    if (mainWindow) {
      mainWindow.webContents.send('system-resumed');
    }
  });
  
  powerMonitor.on('suspend', () => {
    console.log('[MAIN] System suspending');
    if (mainWindow) {
      mainWindow.webContents.send('system-suspending');
    }
  });
}

/**
 * Desktop Logger (Main Process)
 * 
 * Provides logging functionality for the desktop application.
 * Logs are written to a file in the user data directory for debugging.
 */

const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'kestrel-desktop.log');

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format log entry with timestamp
 */
function formatLogEntry(level, message, context) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}\n`;
}

/**
 * Write log entry to file
 */
function writeLog(level, message, context) {
  try {
    ensureLogDirectory();
    const entry = formatLogEntry(level, message, context);
    fs.appendFileSync(LOG_FILE, entry);
  } catch (error) {
    console.error('[LOGGER] Failed to write log:', error);
  }
}

/**
 * Logger object
 */
const logger = {
  debug(message, context) {
    writeLog(LogLevel.DEBUG, message, context);
    console.debug(`[DEBUG] ${message}`, context || '');
  },
  info(message, context) {
    writeLog(LogLevel.INFO, message, context);
    console.info(`[INFO] ${message}`, context || '');
  },
  warn(message, context) {
    writeLog(LogLevel.WARN, message, context);
    console.warn(`[WARN] ${message}`, context || '');
  },
  error(message, error) {
    const context = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error;
    writeLog(LogLevel.ERROR, message, context);
    console.error(`[ERROR] ${message}`, context || '');
  },
  getLogFilePath() {
    return LOG_FILE;
  },
  async getLogs() {
    try {
      if (!fs.existsSync(LOG_FILE)) {
        return 'No logs available.';
      }
      return fs.readFileSync(LOG_FILE, 'utf-8');
    } catch (error) {
      this.error('Failed to read logs', error);
      return 'Failed to read logs.';
    }
  },
  clearLogs() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        fs.unlinkSync(LOG_FILE);
      }
    } catch (error) {
      this.error('Failed to clear logs', error);
    }
  },
  getSystemInfo() {
    const os = require('os');
    return `
System Information:
- OS: ${os.type()} ${os.release()}
- Platform: ${os.platform()} ${os.arch()}
- Node Version: ${process.version}
- Electron Version: ${process.versions.electron}
- App Version: ${app.getVersion()}
- User Data: ${app.getPath('userData')}
- Log File: ${LOG_FILE}
    `.trim();
  },
};

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  // Get first-run status
  ipcMain.handle('get-first-run', () => {
    return store.get('firstRun', true);
  });
  
  // Mark first-run as complete
  ipcMain.handle('set-first-run-complete', () => {
    store.set('firstRun', false);
  });
  
  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
  
  // Get platform info
  ipcMain.handle('get-platform', () => {
    return {
      platform: process.platform,
      arch: process.arch,
    };
  });
  
  // Open external URL in system browser
  ipcMain.handle('open-external-url', (event, url) => {
    require('electron').shell.openExternal(url);
  });
  
  // Show/hide window
  ipcMain.handle('show-window', () => {
    if (mainWindow) mainWindow.show();
  });
  
  ipcMain.handle('hide-window', () => {
    if (mainWindow) mainWindow.hide();
  });
  
  // Minimize to tray
  ipcMain.handle('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });
  
  // Quit app
  ipcMain.handle('quit-app', () => {
    app.quit();
  });
  
  // Logging IPC handlers
  ipcMain.handle('log-debug', (event, message, context) => {
    logger.debug(message, context);
  });
  
  ipcMain.handle('log-info', (event, message, context) => {
    logger.info(message, context);
  });
  
  ipcMain.handle('log-warn', (event, message, context) => {
    logger.warn(message, context);
  });
  
  ipcMain.handle('log-error', (event, message, error) => {
    logger.error(message, error);
  });
  
  ipcMain.handle('get-logs', async () => {
    return await logger.getLogs();
  });
  
  ipcMain.handle('get-log-file-path', () => {
    return logger.getLogFilePath();
  });
  
  ipcMain.handle('get-system-info', () => {
    return logger.getSystemInfo();
  });
  
  ipcMain.handle('clear-logs', () => {
    logger.clearLogs();
  });
  
  // Send logs via email (for support)
  ipcMain.handle('send-logs', async () => {
    try {
      const logs = await logger.getLogs();
      const systemInfo = logger.getSystemInfo();
      
      // Create email body with logs and system info
      const emailBody = `
Kestrel Desktop Application Logs

${systemInfo}

Logs:
${logs}
      `.trim();
      
      // Open mailto link with logs
      const { shell } = require('electron');
      const mailtoLink = `mailto:support@kestrel.com?subject=Kestrel Desktop Logs&body=${encodeURIComponent(emailBody)}`;
      shell.openExternal(mailtoLink);
      
      logger.info('Logs sent via email');
      return true;
    } catch (error) {
      logger.error('Failed to send logs', error);
      return false;
    }
  });
  
  // Device lifecycle IPC handlers
  ipcMain.handle('get-twilio-token', async (event, token, tenantId) => {
    try {
      // Make request to backend to get Twilio token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://app.kestrel.com'}/twilio/device-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Twilio token');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Failed to get Twilio token', error);
      throw error;
    }
  });
  
  // Notification IPC handlers
  let notificationTimeout = null;
  
  ipcMain.handle('show-notification', (event, options) => {
    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: options.title || 'Kestrel VoiceOps',
          body: options.body || '',
          icon: path.join(__dirname, '../resources/icon.png'),
          silent: false,
        });
        
        notification.on('click', () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        });
        
        notification.show();
        logger.info('Notification shown', { title: options.title });
      } else {
        logger.warn('Notifications not supported on this platform');
      }
    } catch (error) {
      logger.error('Failed to show notification', error);
    }
  });
  
  ipcMain.handle('play-ringtone', () => {
    try {
      // TODO: Implement ringtone playback
      // For now, just use the system notification sound
      logger.info('Ringtone playback requested');
      
      // In a full implementation, this would:
      // 1. Load a ringtone audio file
      // 2. Play it in a loop
      // 3. Stop when call is answered or rejected
    } catch (error) {
      logger.error('Failed to play ringtone', error);
    }
  });
  
  ipcMain.handle('stop-ringtone', () => {
    try {
      // TODO: Stop ringtone playback
      logger.info('Ringtone stop requested');
    } catch (error) {
      logger.error('Failed to stop ringtone', error);
    }
  });
  
  // Keyboard shortcut IPC handlers
  const shortcuts = new Map();
  
  ipcMain.handle('register-shortcut', (event, accelerator, action) => {
    try {
      // Unregister existing shortcut for this action
      if (shortcuts.has(action)) {
        globalShortcut.unregister(shortcuts.get(action));
      }
      
      // Register new shortcut
      const success = globalShortcut.register(accelerator, () => {
        logger.info('Keyboard shortcut triggered', { accelerator, action });
        // Send event to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('shortcut-triggered', { action });
        }
      });
      
      if (success) {
        shortcuts.set(action, accelerator);
        logger.info('Keyboard shortcut registered', { accelerator, action });
      } else {
        logger.warn('Failed to register keyboard shortcut', { accelerator, action });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to register keyboard shortcut', error);
      return false;
    }
  });
  
  ipcMain.handle('unregister-shortcut', (event, action) => {
    try {
      if (shortcuts.has(action)) {
        const accelerator = shortcuts.get(action);
        globalShortcut.unregister(accelerator);
        shortcuts.delete(action);
        logger.info('Keyboard shortcut unregistered', { accelerator, action });
      }
    } catch (error) {
      logger.error('Failed to unregister keyboard shortcut', error);
    }
  });
  
  ipcMain.handle('unregister-all-shortcuts', () => {
    try {
      globalShortcut.unregisterAll();
      shortcuts.clear();
      logger.info('All keyboard shortcuts unregistered');
    } catch (error) {
      logger.error('Failed to unregister all shortcuts', error);
    }
  });
  
  // External URL handler (for opening browser for OAuth)
  ipcMain.handle('open-external-url', (event, url) => {
    try {
      const { shell } = require('electron');
      shell.openExternal(url);
      logger.info('Opened external URL', { url });
    } catch (error) {
      logger.error('Failed to open external URL', error);
      throw error;
    }
  });
}

/**
 * Application lifecycle events
 */

// App ready - create window and setup
app.whenReady().then(() => {
  registerProtocol();
  createWindow();
  createTray();
  setupPowerMonitor();
  setupIpcHandlers();
  
  // Handle protocol on Windows/Linux
  app.on('open-url', handleProtocol);
  
  // macOS: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// All windows closed - quit on Windows/Linux, keep running on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App quit - cleanup
app.on('before-quit', () => {
  console.log('[MAIN] App quitting');
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  // Cleanup resources here
});

// Second instance opened - focus the main window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('[MAIN] Uncaught exception:', error);
  // Log to file in production
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MAIN] Unhandled rejection at:', promise, 'reason:', reason);
  // Log to file in production
});
