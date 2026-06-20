/**
 * Supabase Realtime Hook
 * 
 * Manages Supabase Realtime subscriptions for the desktop app.
 * 
 * Required subscriptions per verification doc (GAP 7):
 * 1. postgres_changes on tables (call_copilot_events, call_state_events, call_transcript_events)
 * 2. broadcast on custom channel (incoming-calls)
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '../lib/desktop-logger';

const logger = getLogger();

interface RealtimeSubscriptionConfig {
  tenantId: string;
  onIncomingCall?: (data: { callSid: string; phoneNumber: string }) => void;
  onCopilotEvent?: (data: unknown) => void;
  onTranscriptEvent?: (data: unknown) => void;
  onCallStateChange?: (data: unknown) => void;
}

export function useSupabaseRealtime(config: RealtimeSubscriptionConfig) {
  const { tenantId, onIncomingCall, onCopilotEvent, onTranscriptEvent, onCallStateChange } = config;
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelsRef = useRef<any[]>([]);

  /**
   * Initialize Supabase client
   */
  const getSupabaseClient = useCallback(() => {
    if (supabaseRef.current) {
      return supabaseRef.current;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Supabase URL or anon key not configured');
      throw new Error('Supabase configuration missing');
    }

    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
      },
    });

    return supabaseRef.current;
  }, []);

  /**
   * Setup incoming calls broadcast subscription
   */
  const setupIncomingCallsSubscription = useCallback((supabase: ReturnType<typeof createClient>) => {
    logger.info('Setting up incoming calls broadcast subscription');

    const channel = supabase
      .channel('incoming-calls-desktop')
      .on(
        'broadcast',
        { event: 'incoming-call' },
        (payload) => {
          logger.info('Incoming call received via broadcast', payload);
          onIncomingCall?.(payload.payload as { callSid: string; phoneNumber: string });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Incoming calls broadcast subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Incoming calls broadcast subscription error');
        }
      });

    channelsRef.current.push(channel);
  }, [onIncomingCall]);

  /**
   * Setup copilot events postgres_changes subscription
   */
  const setupCopilotEventsSubscription = useCallback((supabase: ReturnType<typeof createClient>) => {
    logger.info('Setting up copilot events postgres_changes subscription');

    const channel = supabase
      .channel('copilot-events-desktop')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_copilot_events',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          logger.info('Copilot event received', payload);
          onCopilotEvent?.(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Copilot events subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Copilot events subscription error');
        }
      });

    channelsRef.current.push(channel);
  }, [tenantId, onCopilotEvent]);

  /**
   * Setup transcript events postgres_changes subscription
   */
  const setupTranscriptEventsSubscription = useCallback((supabase: ReturnType<typeof createClient>) => {
    logger.info('Setting up transcript events postgres_changes subscription');

    const channel = supabase
      .channel('transcript-events-desktop')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_transcript_events',
        },
        (payload) => {
          logger.info('Transcript event received', payload);
          onTranscriptEvent?.(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Transcript events subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Transcript events subscription error');
        }
      });

    channelsRef.current.push(channel);
  }, [onTranscriptEvent]);

  /**
   * Setup call state changes postgres_changes subscription
   */
  const setupCallStateSubscription = useCallback((supabase: ReturnType<typeof createClient>) => {
    logger.info('Setting up call state postgres_changes subscription');

    const channel = supabase
      .channel('call-state-desktop')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_state_events',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          logger.info('Call state event received', payload);
          onCallStateChange?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Call state subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Call state subscription error');
        }
      });

    channelsRef.current.push(channel);
  }, [tenantId, onCallStateChange]);

  /**
   * Setup all subscriptions on mount
   */
  useEffect(() => {
    if (!tenantId) {
      logger.warn('Cannot setup subscriptions: missing tenantId');
      return;
    }

    try {
      const supabase = getSupabaseClient();

      // Setup all subscriptions
      setupIncomingCallsSubscription(supabase);
      setupCopilotEventsSubscription(supabase);
      setupTranscriptEventsSubscription(supabase);
      setupCallStateSubscription(supabase);

      logger.info('All Supabase Realtime subscriptions setup complete');
    } catch (error) {
      logger.error('Failed to setup Supabase Realtime subscriptions', error);
    }

    // Cleanup on unmount
    return () => {
      logger.info('Cleaning up Supabase Realtime subscriptions');
      channelsRef.current.forEach((channel) => {
        (supabaseRef.current as any)?.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [
    tenantId,
    getSupabaseClient,
    setupIncomingCallsSubscription,
    setupCopilotEventsSubscription,
    setupTranscriptEventsSubscription,
    setupCallStateSubscription,
  ]);

  return {
    isSubscribed: channelsRef.current.length > 0,
  };
}
