/**
 * Audio Device Selection Hook
 * 
 * Manages audio device enumeration and selection for the desktop app.
 * 
 * Features:
 * - Enumerate available audio input/output devices
 * - Select preferred devices
 * - Persist device preferences
 * - Handle device permission requests
 */

import { useState, useEffect, useCallback } from 'react';
import { getDesktopDialerCore } from '@/lib/twilio/DialerCore';
import { getLogger } from '../lib/desktop-logger';
import type { AudioDevice } from '@/lib/twilio/DialerCore';

const logger = getLogger();

interface AudioDeviceSettings {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      logger.info('Requesting microphone permission');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately (we just need permission)
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      logger.info('Microphone permission granted');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Permission denied');
      logger.error('Microphone permission denied', err);
      setError(err);
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Enumerate available audio devices
   */
  const enumerateDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Enumerating audio devices');
      
      const dialerCore = getDesktopDialerCore();
      const audioDevices = await dialerCore.getAudioDevices();
      
      setDevices(audioDevices);
      logger.info(`Found ${audioDevices.length} audio devices`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to enumerate devices');
      logger.error('Failed to enumerate audio devices', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select input device
   */
  const selectInputDevice = useCallback(async (deviceId: string) => {
    try {
      logger.info(`Selecting input device: ${deviceId}`);
      
      const dialerCore = getDesktopDialerCore();
      await dialerCore.setAudioInputDevice(deviceId);
      
      setSelectedInput(deviceId);
      
      // Persist preference
      const settings: AudioDeviceSettings = {
        inputDeviceId: deviceId,
        outputDeviceId: selectedOutput,
      };
      localStorage.setItem('kestrel_audio_settings', JSON.stringify(settings));
      
      logger.info('Input device selected and preference saved');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to select input device');
      logger.error('Failed to select input device', err);
      setError(err);
      throw err;
    }
  }, [selectedOutput]);

  /**
   * Select output device
   */
  const selectOutputDevice = useCallback(async (deviceId: string) => {
    try {
      logger.info(`Selecting output device: ${deviceId}`);
      
      const dialerCore = getDesktopDialerCore();
      await dialerCore.setAudioOutputDevice(deviceId);
      
      setSelectedOutput(deviceId);
      
      // Persist preference
      const settings: AudioDeviceSettings = {
        inputDeviceId: selectedInput,
        outputDeviceId: deviceId,
      };
      localStorage.setItem('kestrel_audio_settings', JSON.stringify(settings));
      
      logger.info('Output device selected and preference saved');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to select output device');
      logger.error('Failed to select output device', err);
      setError(err);
      throw err;
    }
  }, [selectedInput]);

  /**
   * Load saved preferences
   */
  const loadPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem('kestrel_audio_settings');
      if (saved) {
        const settings: AudioDeviceSettings = JSON.parse(saved);
        setSelectedInput(settings.inputDeviceId);
        setSelectedOutput(settings.outputDeviceId);
        logger.info('Audio device preferences loaded', settings);
      }
    } catch (error) {
      logger.warn('Failed to load audio device preferences', error);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    // Load saved preferences
    loadPreferences();

    // Check if we have permission by trying to enumerate
    navigator.mediaDevices.enumerateDevices()
      .then((deviceList) => {
        // If device labels are empty, we don't have permission yet
        const hasLabels = deviceList.some(device => device.label !== '');
        setHasPermission(hasLabels);
        
        if (hasLabels) {
          enumerateDevices();
        }
      })
      .catch((error) => {
        logger.warn('Failed to check device permissions', error);
      });

    // Listen for device changes
    const handleDeviceChange = () => {
      logger.info('Audio devices changed, re-enumerating');
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices, loadPreferences]);

  const inputDevices = devices.filter(d => d.kind === 'audioinput');
  const outputDevices = devices.filter(d => d.kind === 'audiooutput');

  return {
    devices,
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    loading,
    error,
    hasPermission,
    requestPermission,
    enumerateDevices,
    selectInputDevice,
    selectOutputDevice,
  };
}
