/**
 * Desktop Logger (Renderer Process)
 * 
 * This is a renderer-side wrapper that calls the main process
 * via IPC for actual logging operations.
 */

export class DesktopLogger {
  debug(message: string, context?: unknown): void {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.logDebug(message, context).catch((err) => {
        console.error('[LOGGER] Failed to log debug:', err);
      });
    } else {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: unknown): void {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.logInfo(message, context).catch((err) => {
        console.error('[LOGGER] Failed to log info:', err);
      });
    } else {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: unknown): void {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.logWarn(message, context).catch((err) => {
        console.error('[LOGGER] Failed to log warn:', err);
      });
    } else {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.logError(message, error).catch((err) => {
        console.error('[LOGGER] Failed to log error:', err);
      });
    } else {
      console.error(`[ERROR] ${message}`, error || '');
    }
  }

  async getLogs(): Promise<string> {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      return await window.desktopAPI.getLogs();
    }
    return 'Desktop API not available';
  }

  async getLogFilePath(): Promise<string> {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      return await window.desktopAPI.getLogFilePath();
    }
    return 'Desktop API not available';
  }

  async getSystemInfo(): Promise<string> {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      return await window.desktopAPI.getSystemInfo();
    }
    return 'Desktop API not available';
  }

  async clearLogs(): Promise<void> {
    if (typeof window !== 'undefined' && window.desktopAPI) {
      await window.desktopAPI.clearLogs();
    }
  }
}

// Singleton instance
let loggerInstance: DesktopLogger | null = null;

export function getLogger(): DesktopLogger {
  if (!loggerInstance) {
    loggerInstance = new DesktopLogger();
  }
  return loggerInstance;
}
