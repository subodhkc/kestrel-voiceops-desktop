/**
 * Preload Script - Security Bridge
 * 
 * This script runs in the renderer process before any page content loads.
 * It exposes a safe, limited API to the renderer via contextBridge.
 * 
 * Security Principles:
 * - Only specific IPC channels are exposed
 * - No direct Node.js access
 * - All renderer → main communication goes through this bridge
 * - No arbitrary code execution
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object.
 */
contextBridge.exposeInMainWorld('desktopAPI', {
  /**
   * Get first-run status
   */
  getFirstRun: () => ipcRenderer.invoke('get-first-run'),
  
  /**
   * Mark first-run as complete
   */
  setFirstRunComplete: () => ipcRenderer.invoke('set-first-run-complete'),
  
  /**
   * Get app version
   */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  /**
   * Get platform info
   */
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  /**
   * Open external URL in system browser
   */
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  
  /**
   * Show main window
   */
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  /**
   * Hide main window
   */
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  
  /**
   * Minimize to tray
   */
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  
  /**
   * Quit application
   */
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  /**
   * Listen for auth callback from browser
   */
  onAuthCallback: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('auth-callback', subscription);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('auth-callback', subscription);
    };
  },
  
  /**
   * Listen for call deep links
   */
  onCallDeepLink: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('call-deep-link', subscription);
    
    return () => {
      ipcRenderer.removeListener('call-deep-link', subscription);
    };
  },
  
  /**
   * Listen for system resume (from sleep)
   */
  onSystemResumed: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('system-resumed', subscription);
    
    return () => {
      ipcRenderer.removeListener('system-resumed', subscription);
    };
  },
  
  /**
   * Listen for system suspend (to sleep)
   */
  onSystemSuspending: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('system-suspending', subscription);
    
    return () => {
      ipcRenderer.removeListener('system-suspending', subscription);
    };
  },
  
  /**
   * Open external URL in browser
   */
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  
  /**
   * Logging methods
   */
  logDebug: (message, context) => ipcRenderer.invoke('log-debug', message, context),
  logInfo: (message, context) => ipcRenderer.invoke('log-info', message, context),
  logWarn: (message, context) => ipcRenderer.invoke('log-warn', message, context),
  logError: (message, error) => ipcRenderer.invoke('log-error', message, error),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  sendLogs: () => ipcRenderer.invoke('send-logs'),
  
  /**
   * Device lifecycle methods
   */
  getTwilioToken: (token, tenantId) => ipcRenderer.invoke('get-twilio-token', token, tenantId),
  
  /**
   * Notification methods
   */
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  playRingtone: () => ipcRenderer.invoke('play-ringtone'),
  stopRingtone: () => ipcRenderer.invoke('stop-ringtone'),
  
  /**
   * Keyboard shortcut methods
   */
  registerShortcut: (accelerator, action) => ipcRenderer.invoke('register-shortcut', accelerator, action),
  unregisterShortcut: (action) => ipcRenderer.invoke('unregister-shortcut', action),
  unregisterAllShortcuts: () => ipcRenderer.invoke('unregister-all-shortcuts'),
  
  /**
   * Listen for shortcut-triggered events from main process
   */
  onShortcutTriggered: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('shortcut-triggered', subscription);
    
    return () => {
      ipcRenderer.removeListener('shortcut-triggered', subscription);
    };
  },
});
