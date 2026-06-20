/**
 * Device Lifecycle Hook
 * 
 * Manages Twilio device lifecycle for the desktop app.
 * 
 * Desktop behavior:
 * - Device registered on app launch (after auth)
 * - Never unregistered while app is running
 * - Token refreshed automatically before expiry
 * - Re-registered on system resume from sleep
 * 
 * This hook should be called in the main app component after authentication.
 */

import { useEffect, useState, useCallback } from 'react';
import { getDesktopDialerCore, type DialerCore } from '@/lib/twilio/DialerCore';
import { getLogger } from '../lib/desktop-logger';

const logger = getLogger();

interface DeviceLifecycleConfig {
  token: string;
  tenantId: string;
  onDeviceReady?: () => void;
  onDeviceError?: (error: Error) => void;
  onIncomingCall?: (data: { callSid: string }) => void;
}

export function useDeviceLifecycle(config: DeviceLifecycleConfig) {
  const [deviceReady, setDeviceReady] = useState(false);
  const [deviceError, setDeviceError] = useState<Error | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const { token, tenantId, onDeviceReady, onDeviceError, onIncomingCall } = config;

  /**
   * Get Twilio token from backend
   */
  const getTwilioToken = useCallback(async (): Promise<string> => {
    try {
      logger.info('Fetching Twilio token from backend');
      const response = await window.desktopAPI.getTwilioToken(token, tenantId);
      
      if (!response.success) {
        throw new Error('Failed to get Twilio token');
      }
      
      logger.info('Twilio token fetched successfully');
      return response.token;
    } catch (error) {
      logger.error('Failed to get Twilio token', error);
      throw error;
    }
  }, [token, tenantId]);

  /**
   * Initialize and register device
   */
  const initializeDevice = useCallback(async () => {
    if (isRegistering) {
      logger.warn('Device registration already in progress');
      return;
    }

    try {
      setIsRegistering(true);
      setDeviceError(null);

      logger.info('Initializing Twilio device');
      const twilioToken = await getTwilioToken();
      
      const dialerCore = getDesktopDialerCore({
        logLevel: 'error',
      });

      await dialerCore.initialize(twilioToken);
      
      setDeviceReady(true);
      onDeviceReady?.();
      
      logger.info('Device initialized and registered successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize device');
      logger.error('Device initialization failed', err);
      setDeviceError(err);
      onDeviceError?.(err);
    } finally {
      setIsRegistering(false);
    }
  }, [getTwilioToken, isRegistering, onDeviceReady, onDeviceError]);

  /**
   * Refresh device token
   */
  const refreshToken = useCallback(async () => {
    try {
      logger.info('Refreshing Twilio token');
      const twilioToken = await getTwilioToken();
      
      const dialerCore = getDesktopDialerCore();
      await dialerCore.updateToken(twilioToken);
      
      logger.info('Token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh token', error);
      throw error;
    }
  }, [getTwilioToken]);

  /**
   * Handle system resume (reconnect)
   */
  const handleSystemResume = useCallback(async () => {
    logger.info('System resumed - checking device status');
    
    const dialerCore = getDesktopDialerCore();
    if (!dialerCore.isDeviceReady()) {
      logger.info('Device not ready after system resume, re-initializing');
      await initializeDevice();
    } else {
      logger.info('Device still ready after system resume');
    }
  }, [initializeDevice]);

  /**
   * Setup device lifecycle on mount
   */
  useEffect(() => {
    if (!token || !tenantId) {
      logger.warn('Cannot initialize device: missing token or tenantId');
      return;
    }

    logger.info('Setting up device lifecycle');

    // Initialize device on mount
    initializeDevice();

    // Setup system resume handler
    const unsubscribeResume = window.desktopAPI.onSystemResumed(handleSystemResume);

    // Setup incoming call handler
    const dialerCore = getDesktopDialerCore();
    const unsubscribeIncomingCall = dialerCore.on('callIncoming', (event, data) => {
      logger.info('Incoming call received', data);
      onIncomingCall?.(data as { callSid: string });
    });

    // Setup token refresh timer (refresh 1 hour before expiry)
    const tokenRefreshInterval = setInterval(() => {
      if (deviceReady) {
        refreshToken().catch((error) => {
          logger.error('Scheduled token refresh failed', error);
        });
      }
    }, 23 * 60 * 60 * 1000); // 23 hours (tokens are valid for 24 hours)

    return () => {
      clearInterval(tokenRefreshInterval);
      unsubscribeResume();
      unsubscribeIncomingCall();
      logger.info('Device lifecycle cleanup complete');
    };
  }, [token, tenantId, initializeDevice, refreshToken, handleSystemResume, deviceReady, onIncomingCall]);

  return {
    deviceReady,
    deviceError,
    isRegistering,
    initializeDevice,
    refreshToken,
  };
}
