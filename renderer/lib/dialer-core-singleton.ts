/**
 * Desktop DialerCore Singleton
 * 
 * Singleton instance of DialerCore for the desktop application.
 * The device is registered on app launch and never unregistered while running.
 */

import { DialerCore } from '../../../frontend/lib/twilio/DialerCore';
import { getLogger } from '../lib/desktop-logger';

const logger = getLogger();

let dialerCoreInstance: DialerCore | null = null;

/**
 * Get or create the singleton DialerCore instance
 */
export function getDialerCore(): DialerCore {
  if (!dialerCoreInstance) {
    logger.info('Creating DialerCore singleton for desktop');
    dialerCoreInstance = new DialerCore({
      edge: 'roaming',
      logLevel: 'info',
    });
  }
  return dialerCoreInstance;
}

/**
 * Initialize the DialerCore with token
 */
export async function initializeDialerCore(token: string): Promise<void> {
  const dialerCore = getDialerCore();
  logger.info('Initializing DialerCore with token');
  await dialerCore.initialize(token);
}

/**
 * Update DialerCore token (for token refresh)
 */
export async function updateDialerCoreToken(token: string): Promise<void> {
  const dialerCore = getDialerCore();
  logger.info('Updating DialerCore token');
  await dialerCore.updateToken(token);
}
