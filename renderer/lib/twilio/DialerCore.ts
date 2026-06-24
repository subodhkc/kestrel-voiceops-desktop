/**
 * DialerCore - Shared Twilio Device Management
 * 
 * This class encapsulates the core Twilio Voice SDK functionality
 * for device management and call operations. It's designed to be
 * used by both web (WebRTCDialer) and desktop applications.
 * 
 * Responsibilities:
 * - Device initialization and token management
 * - Device registration lifecycle
 * - Call operations (make, end, mute, unmute)
 * - Audio device enumeration and selection (desktop)
 * - Call state event handling
 * - Error handling and recovery
 * 
 * Architecture Note:
 * - Desktop: Device registered on app launch, never unregistered while running
 * - Web: Device registered when dialer opens, unregistered when dialer closes
 * 
 * v0.11.10 - Added Promise-based registration and state machine
 * v0.11.20 - Added device lifecycle logging for debugging
 */

import { Device, Call } from '@twilio/voice-sdk';

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended';
export type RegistrationState = 'unregistered' | 'registering' | 'registered' | 'error';
export type DialerEvent = 
  | 'deviceReady' 
  | 'deviceError' 
  | 'callIncoming' 
  | 'callConnecting' 
  | 'callConnected' 
  | 'callEnded' 
  | 'callError'
  | 'deviceRegistered'
  | 'deviceUnregistered';

export interface DialerConfig {
  token: string;
  edge?: string; // Twilio edge region
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CallOptions {
  phoneNumber: string;
  fromNumber?: string;
  enableRecording?: boolean;
  conferenceName?: string;
  aiMode?: 'adaptive' | 'streaming' | 'hybrid' | 'copilot' | 'none';
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface DialerEventCallback {
  (event: DialerEvent, data?: unknown): void;
}

export class DialerCore {
  private device: Device | null = null;
  private activeCall: Call | null = null;
  private token: string | null = null;
  private isRegistered: boolean = false;
  private registrationState: RegistrationState = 'unregistered';
  private eventCallbacks: Map<DialerEvent, Set<DialerEventCallback>> = new Map();
  private config: Partial<DialerConfig> = {};
  private audioElement: HTMLAudioElement | null = null;
  private registrationPromise: Promise<void> | null = null;
  private resolveRegistration: (() => void) | null = null;
  private deviceCreatedAt: number | null = null; // Track device creation time for debugging
  private selectedInputDeviceId: string | null = null;
  private selectedOutputDeviceId: string | null = null;

  constructor(config?: Partial<DialerConfig>) {
    this.config = config || {};
    this.initializeEventCallbacks();
  }

  /**
   * Initialize event callback sets
   */
  private initializeEventCallbacks(): void {
    const events: DialerEvent[] = [
      'deviceReady', 'deviceError', 'callIncoming', 'callConnecting',
      'callConnected', 'callEnded', 'callError', 'deviceRegistered', 'deviceUnregistered'
    ];
    events.forEach(event => {
      this.eventCallbacks.set(event, new Set());
    });
  }

  /**
   * Register event listener
   */
  on(event: DialerEvent, callback: DialerEventCallback): () => void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.add(callback);
    }
    
    // Return unsubscribe function
    return () => {
      const cbs = this.eventCallbacks.get(event);
      if (cbs) {
        cbs.delete(callback);
      }
    };
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: DialerEvent, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error(`[DialerCore] Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Initialize Twilio Device with token
   */
  async initialize(token: string): Promise<void> {
    this.token = token;

    try {
      this.registrationState = 'registering';
      console.log('[DialerCore] State changed to: registering');

      console.log('[DialerCore] Creating registration promise');
      this.registrationPromise = new Promise((resolve) => {
        this.resolveRegistration = resolve;
      });

      this.device = new Device(token, {
        codecPreferences: ['opus' as any, 'pcmu' as any],
        edge: this.config.edge || 'roaming',
        logLevel: this.config.logLevel || 'error',
      });

      this.deviceCreatedAt = Date.now();
      console.log('[DialerCore] Device created at timestamp:', this.deviceCreatedAt);

      this.setupDeviceEventHandlers();
      
      console.log('[DialerCore] Calling device.register()');
      await this.device.register();
      console.log('[DialerCore] device.register() completed, waiting for registered event');
      
      // Wait for the registered event to fire
      await this.registrationPromise;
      console.log('[DialerCore] Registration promise resolved - device is truly ready');
      this.registrationState = 'registered';
      console.log('[DialerCore] State changed to: registered');
    } catch (error) {
      console.error('[DialerCore] Failed to initialize device:', error);
      this.registrationState = 'error';
      console.log('[DialerCore] State changed to: error');
      this.emit('deviceError', error);
      throw error;
    }
  }

  /**
   * Update device token (for token refresh)
   */
  async updateToken(token: string): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      this.token = token;
      await this.device.updateToken(token);
      console.log('[DialerCore] Token updated successfully');
    } catch (error) {
      console.error('[DialerCore] Failed to update token:', error);
      this.emit('deviceError', error);
      throw error;
    }
  }

  /**
   * Setup device event handlers
   */
  private setupDeviceEventHandlers(): void {
    if (!this.device) return;

    this.device.on('registered', () => {
      console.log('[DialerCore] Device registered');
      this.isRegistered = true;
      this.registrationState = 'registered';
      console.log('[DialerCore] State changed to: registered');
      this.emit('deviceRegistered');
      this.emit('deviceReady'); // Emit deviceReady when Twilio confirms registration
      // Resolve the registration promise
      if (this.resolveRegistration) {
        console.log('[DialerCore] Resolving registration promise');
        this.resolveRegistration();
        this.resolveRegistration = null;
      }
    });

    this.device.on('unregistered', () => {
      console.log('[DialerCore] Device unregistered - device will be destroyed');
      this.isRegistered = false;
      this.registrationState = 'unregistered';
      console.log('[DialerCore] State changed to: unregistered');
      console.log('[DialerCore] Device reference before null:', !!this.device);
      this.device = null; // Explicitly nullify device on unregistered
      console.log('[DialerCore] Device reference after null:', !!this.device);
      this.emit('deviceUnregistered');
    });

    this.device.on('error', (error: any) => {
      console.error('[DialerCore] Device error:', error);
      this.isRegistered = false;
      this.registrationState = 'error';
      console.log('[DialerCore] State changed to: error');
      this.emit('deviceError', error);
    });

    this.device.on('incoming', (call: Call) => {
      console.log('[DialerCore] Incoming call');
      this.activeCall = call;
      this.setupCallEventHandlers(call);
      this.emit('callIncoming', { callSid: call.parameters.CallSid });
    });
  }

  /**
   * Setup call event handlers
   */
  private setupCallEventHandlers(call: Call): void {
    call.on('accept', () => {
      console.log('[DialerCore] Call accepted');
      
      // Create audio element for mute control
      this.setupAudioElement(call);
      
      this.emit('callConnected');
    });

    call.on('disconnect', () => {
      console.log('[DialerCore] Call disconnected');
      this.cleanupAudioElement();
      this.activeCall = null;
      this.emit('callEnded');
    });

    call.on('cancel', () => {
      console.log('[DialerCore] Call cancelled');
      this.cleanupAudioElement();
      this.activeCall = null;
      this.emit('callEnded');
    });

    call.on('reject', () => {
      console.log('[DialerCore] Call rejected');
      this.cleanupAudioElement();
      this.activeCall = null;
      this.emit('callEnded');
    });

    call.on('error', (error: any) => {
      console.error('[DialerCore] Call error:', error);
      this.cleanupAudioElement();
      this.emit('callError', error);
    });
  }

  /**
   * Setup audio element for mute control
   */
  private setupAudioElement(call: Call): void {
    try {
      // Get remote stream from the call
      const remoteStream = call.getRemoteStream();

      if (remoteStream) {
        // Create audio element if it doesn't exist
        if (!this.audioElement) {
          this.audioElement = new Audio();
          this.audioElement.autoplay = true;
          this.audioElement.srcObject = remoteStream;

          // Apply selected output device if set
          if (this.selectedOutputDeviceId) {
            if (typeof (this.audioElement as any).setSinkId === 'function') {
              (this.audioElement as any).setSinkId(this.selectedOutputDeviceId)
                .then(() => console.log('[DialerCore] Output device applied'))
                .catch((err: Error) => console.error('[DialerCore] Failed to set output device:', err));
            }
          }

          console.log('[DialerCore] Audio element created and stream attached');
        }
      } else {
        console.warn('[DialerCore] No remote stream available for audio element');
      }
    } catch (error) {
      console.error('[DialerCore] Failed to setup audio element:', error);
    }
  }

  /**
   * Cleanup audio element
   */
  private cleanupAudioElement(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
      console.log('[DialerCore] Audio element cleaned up');
    }
  }

  /**
   * Make an outbound call
   */
  async makeCall(options: CallOptions): Promise<Call> {
    console.log('[DialerCore] makeCall called', {
      hasDevice: !!this.device,
      deviceCreatedAt: this.deviceCreatedAt,
      registrationState: this.registrationState,
      isRegistered: this.isRegistered,
      currentTime: Date.now(),
      deviceAge: this.deviceCreatedAt ? Date.now() - this.deviceCreatedAt : null
    });

    if (!this.device) {
      console.error('[DialerCore] Device is null in makeCall!', {
        deviceCreatedAt: this.deviceCreatedAt,
        registrationState: this.registrationState,
        isRegistered: this.isRegistered
      });
      throw new Error('Device not initialized. Call initialize() first.');
    }

    // Wait for registration to complete if it's in progress
    if (this.registrationPromise) {
      console.log('[DialerCore] Waiting for registration to complete before making call');
      await this.registrationPromise;
      console.log('[DialerCore] Registration completed, proceeding with call');
    }

    if (this.registrationState !== 'registered') {
      throw new Error(`Device not ready. Current state: ${this.registrationState}. Call initialize() first.`);
    }

    try {
      this.emit('callConnecting', { phoneNumber: options.phoneNumber });

      const connectOptions: any = {
        params: {
          To: options.phoneNumber,
        },
      };

      if (options.fromNumber) {
        connectOptions.params.From = options.fromNumber;
      }

      if (options.enableRecording) {
        connectOptions.params.Record = 'true';
      }

      if (options.conferenceName) {
        connectOptions.params.ConferenceName = options.conferenceName;
      }

      if (options.aiMode) {
        connectOptions.params.AIMode = options.aiMode;
      }

      const call = await this.device.connect(connectOptions);
      this.activeCall = call;
      this.setupCallEventHandlers(call);

      console.log('[DialerCore] Call initiated');
      return call;
    } catch (error) {
      console.error('[DialerCore] Failed to make call:', error);
      this.emit('callError', error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptIncomingCall(): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No incoming call to accept');
    }

    try {
      await this.activeCall.accept();
      console.log('[DialerCore] Incoming call accepted');
    } catch (error) {
      console.error('[DialerCore] Failed to accept call:', error);
      this.emit('callError', error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectIncomingCall(): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No incoming call to reject');
    }

    try {
      await this.activeCall.reject();
      this.activeCall = null;
      console.log('[DialerCore] Incoming call rejected');
    } catch (error) {
      console.error('[DialerCore] Failed to reject call:', error);
      this.emit('callError', error);
      throw error;
    }
  }

  /**
   * End the active call
   */
  async endCall(): Promise<void> {
    if (!this.activeCall) {
      console.warn('[DialerCore] No active call to end');
      return;
    }

    try {
      this.activeCall.disconnect();
      this.activeCall = null;
      console.log('[DialerCore] Call ended');
    } catch (error) {
      console.error('[DialerCore] Failed to end call:', error);
      this.emit('callError', error);
      throw error;
    }
  }

  /**
   * Set the audio element for mute control
   */
  setAudioElement(element: HTMLAudioElement | null): void {
    this.audioElement = element;
    console.log('[DialerCore] Audio element set');
  }

  /**
   * Mute the active call
   */
  async muteCall(): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No active call to mute');
    }

    try {
      if (this.audioElement) {
        this.audioElement.muted = true;
        console.log('[DialerCore] Call muted');
      } else {
        console.warn('[DialerCore] No audio element set for muting');
      }
    } catch (error) {
      console.error('[DialerCore] Failed to mute call:', error);
      throw error;
    }
  }

  /**
   * Unmute the active call
   */
  async unmuteCall(): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No active call to unmute');
    }

    try {
      if (this.audioElement) {
        this.audioElement.muted = false;
        console.log('[DialerCore] Call unmuted');
      } else {
        console.warn('[DialerCore] No audio element set for unmuting');
      }
    } catch (error) {
      console.error('[DialerCore] Failed to unmute call:', error);
      throw error;
    }
  }

  /**
   * Send DTMF digit during active call
   */
  async sendDigits(digit: string): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No active call to send DTMF');
    }

    try {
      // Twilio Call.sendDigits() sends DTMF tones
      this.activeCall.sendDigits(digit);
      console.log('[DialerCore] DTMF digit sent:', digit);
    } catch (error) {
      console.error('[DialerCore] Failed to send DTMF digit:', error);
      throw error;
    }
  }

  /**
   * Get available audio devices (desktop only)
   */
  async getAudioDevices(): Promise<AudioDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices: AudioDevice[] = devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as 'audioinput' | 'audiooutput',
        }));

      return audioDevices;
    } catch (error) {
      console.error('[DialerCore] Failed to enumerate audio devices:', error);
      return [];
    }
  }

  /**
   * Set audio input device (desktop only)
   */
  async setAudioInputDevice(deviceId: string): Promise<void> {
    this.selectedInputDeviceId = deviceId;
    console.log('[DialerCore] Audio input device set:', deviceId);
    // Note: Will be applied on next call via media stream constraints
  }

  /**
   * Set audio output device (desktop only)
   */
  async setAudioOutputDevice(deviceId: string): Promise<void> {
    this.selectedOutputDeviceId = deviceId;
    console.log('[DialerCore] Audio output device set:', deviceId);
    
    // Apply to existing audio element if call is active
    if (this.audioElement) {
      try {
        // Check if setSinkId is supported (Chrome/Edge)
        if (typeof (this.audioElement as any).setSinkId === 'function') {
          await (this.audioElement as any).setSinkId(deviceId);
          console.log('[DialerCore] Output device applied to active audio element');
        } else {
          console.warn('[DialerCore] setSinkId not supported in this browser');
        }
      } catch (error) {
        console.error('[DialerCore] Failed to set output device on active element:', error);
      }
    }
  }

  /**
   * Get current call status
   */
  getCallStatus(): CallStatus {
    if (!this.activeCall) {
      return 'idle';
    }

    // Twilio Call object has status properties
    const status = this.activeCall.status() as any;
    switch (status) {
      case 'connecting':
      case 'pending':
        return 'connecting';
      case 'ringing':
        return 'ringing';
      case 'open':
      case 'connected' as any:
        return 'connected';
      case 'closed':
        return 'ended';
      default:
        return 'idle';
    }
  }

  /**
   * Get active call SID
   */
  getActiveCallSid(): string | null {
    return this.activeCall?.parameters.CallSid || null;
  }

  /**
   * Check if device is ready
   */
  isDeviceReady(): boolean {
    return this.device !== null && this.registrationState === 'registered';
  }

  /**
   * Get current registration state
   */
  getRegistrationState(): RegistrationState {
    return this.registrationState;
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.activeCall !== null;
  }

  /**
   * Unregister device (for web app cleanup)
   */
  async unregister(): Promise<void> {
    if (!this.device || !this.isRegistered) {
      return;
    }

    try {
      if (this.activeCall) {
        await this.endCall();
      }
      
      await this.device.unregister();
      this.isRegistered = false;
      this.device.destroy();
      this.device = null;
      
      this.emit('deviceUnregistered');
      console.log('[DialerCore] Device unregistered and destroyed');
    } catch (error) {
      console.error('[DialerCore] Failed to unregister device:', error);
      throw error;
    }
  }

  /**
   * Destroy the dialer core and cleanup
   */
  async destroy(): Promise<void> {
    try {
      await this.unregister();
      this.eventCallbacks.clear();
      this.token = null;
      console.log('[DialerCore] DialerCore destroyed');
    } catch (error) {
      console.error('[DialerCore] Failed to destroy dialer core:', error);
      throw error;
    }
  }
}

// Singleton instance for desktop (device registered on launch, never unregistered)
let desktopInstance: DialerCore | null = null;

/**
 * Get or create desktop DialerCore singleton
 * Desktop: Device registered on app launch, never unregistered while running
 */
export function getDesktopDialerCore(config?: Partial<DialerConfig>): DialerCore {
  if (!desktopInstance) {
    desktopInstance = new DialerCore(config);
  }
  return desktopInstance;
}

/**
 * Destroy desktop DialerCore singleton (for app quit)
 */
export function destroyDesktopDialerCore(): void {
  if (desktopInstance) {
    desktopInstance.destroy();
    desktopInstance = null;
  }
}

/**
 * Create a new DialerCore instance (for web app)
 * Web: Device registered when dialer opens, unregistered when dialer closes
 */
export function createDialerCore(config?: Partial<DialerConfig>): DialerCore {
  return new DialerCore(config);
}
