/**
 * Desktop API Type Definitions
 * 
 * Shared type declarations for the desktop API exposed via IPC.
 * This file should be imported wherever desktopAPI is used.
 */

export interface DesktopAPI {
  getFirstRun: () => Promise<boolean>;
  setFirstRunComplete: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<{ platform: string; arch: string }>;
  openExternalUrl: (url: string) => Promise<void>;
  showWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  minimizeToTray: () => Promise<void>;
  quitApp: () => Promise<void>;
  onAuthCallback: (callback: (data: { token?: string; error?: string }) => void) => () => void;
  onCallDeepLink: (callback: (data: { phone?: string }) => void) => () => void;
  onSystemResumed: (callback: () => void) => () => void;
  onSystemSuspending: (callback: () => void) => () => void;
  logDebug: (message: string, context?: unknown) => Promise<void>;
  logInfo: (message: string, context?: unknown) => Promise<void>;
  logWarn: (message: string, context?: unknown) => Promise<void>;
  logError: (message: string, error?: Error | unknown) => Promise<void>;
  getLogs: () => Promise<string>;
  getLogFilePath: () => Promise<string>;
  getSystemInfo: () => Promise<string>;
  clearLogs: () => Promise<void>;
  sendLogs: () => Promise<boolean>;
  getTwilioToken: (token: string, tenantId: string) => Promise<{ success: boolean; token: string; ttl: number }>;
  showNotification: (options: { title: string; body: string }) => Promise<void>;
  playRingtone: () => Promise<void>;
  stopRingtone: () => Promise<void>;
  registerShortcut: (accelerator: string, action: string) => Promise<boolean>;
  unregisterShortcut: (action: string) => Promise<void>;
  unregisterAllShortcuts: () => Promise<void>;
  onShortcutTriggered: (callback: (data: { action: string }) => void) => () => void;
}

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}
