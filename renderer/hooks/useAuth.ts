/**
 * Desktop Auth Hook
 * 
 * Manages authentication flow for the desktop app.
 * Uses browser OAuth + custom protocol callback (kestrel://auth/callback).
 * 
 * Flow:
 * 1. Check if user has valid session
 * 2. If not, open browser to web login page with redirect to kestrel://auth/callback
 * 3. Main process intercepts callback and sends token to renderer
 * 4. Renderer sets session in Supabase client
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '../lib/desktop-logger';

const logger = getLogger();

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: unknown | null;
  tenantId: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    tenantId: null,
  });

  /**
   * Initialize Supabase client for desktop
   */
  const getSupabaseClient = useCallback(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or anon key not configured');
    }
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Desktop doesn't use URL-based auth
      },
    });
  }, []);

  /**
   * Check current session
   */
  const checkSession = useCallback(async () => {
    try {
      logger.info('Checking authentication session');
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Failed to get session', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tenantId: null,
        });
        return;
      }
      
      if (session) {
        // Get tenant ID from localStorage or fetch from API
        const tenantId = localStorage.getItem('kestrel_active_tenant_v1');
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: session.user,
          tenantId,
        });
        
        logger.info('User authenticated', { userId: session.user?.id, tenantId });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tenantId: null,
        });
        
        logger.info('No active session');
      }
    } catch (error) {
      logger.error('Session check failed', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tenantId: null,
      });
    }
  }, [getSupabaseClient]);

  /**
   * Initiate browser OAuth login
   */
  const login = useCallback(async () => {
    try {
      logger.info('Initiating browser OAuth login');
      
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.kestrel.com';
      const redirectUri = 'kestrel://auth/callback';
      
      // Open browser to login page with redirect to custom protocol
      const loginUrl = `${siteUrl}/login?redirect=${encodeURIComponent(redirectUri)}`;
      
      // Use desktop API to open browser
      if (typeof window !== 'undefined' && window.desktopAPI) {
        await window.desktopAPI.openExternalUrl(loginUrl);
        logger.info('Opened browser for OAuth login', { loginUrl });
      } else {
        // Fallback: open in same window (not ideal)
        window.open(loginUrl, '_blank');
      }
    } catch (error) {
      logger.error('Failed to initiate login', error);
      throw error;
    }
  }, []);

  /**
   * Handle auth callback from browser
   */
  const handleAuthCallback = useCallback(async (token: string) => {
    try {
      logger.info('Handling auth callback');
      const supabase = getSupabaseClient();
      
      // Set session with the token from callback
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '', // Will be refreshed on next API call
      });
      
      if (error) {
        logger.error('Failed to set session', error);
        throw error;
      }
      
      // Get tenant ID
      const tenantId = localStorage.getItem('kestrel_active_tenant_v1');
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
        tenantId,
      });
      
      logger.info('Auth callback handled successfully', { userId: data.user?.id });
    } catch (error) {
      logger.error('Auth callback failed', error);
      throw error;
    }
  }, [getSupabaseClient]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      logger.info('Logging out');
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      
      localStorage.removeItem('kestrel_active_tenant_v1');
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tenantId: null,
      });
      
      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }, [getSupabaseClient]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    checkSession();
    
    // Listen for auth callback from main process
    const handleAuthCallbackEvent = (event: CustomEvent) => {
      const { token } = event.detail;
      handleAuthCallback(token);
    };
    
    window.addEventListener('auth-callback', handleAuthCallbackEvent as EventListener);
    
    // Listen for auth-required events from api-client
    const handleAuthRequired = () => {
      login();
    };
    
    window.addEventListener('auth-required', handleAuthRequired);
    
    return () => {
      window.removeEventListener('auth-callback', handleAuthCallbackEvent as EventListener);
      window.removeEventListener('auth-required', handleAuthRequired);
    };
  }, [checkSession, handleAuthCallback, login]);

  return {
    ...authState,
    login,
    logout,
    checkSession,
    handleAuthCallback,
  };
}
