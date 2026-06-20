/**
 * Desktop API Client
 * 
 * Desktop-specific API client that replaces window.location.href redirects
 * with IPC events to trigger desktop-native auth flows.
 * 
 * Critical difference from web api-client:
 * - On 401/session expiry: Emits IPC event instead of navigating to /login
 * - On auth required: Emits IPC event to show desktop auth modal
 */

interface ApiCallOptions extends RequestInit {
  skipAuth?: boolean;
  skipTenantCheck?: boolean;
}

/**
 * Desktop-specific API call function
 * 
 * Replaces window.location.href redirects with IPC events for desktop app.
 */
export async function apiCall(
  url: string,
  options: ApiCallOptions = {}
): Promise<Response> {
  const {
    skipAuth = false,
    skipTenantCheck = false,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  // Add default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Get session from Supabase (desktop uses same client as web)
  let token: string | null = null;
  
  if (!skipAuth && typeof window !== 'undefined') {
    try {
      // Import Supabase client dynamically to avoid SSR issues
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            storage: window.localStorage,
          },
        });
        
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('[API_CLIENT] Failed to get session:', error);
    }
  }

  // Add tenant header if available (desktop uses x-tenant-id)
  if (!skipTenantCheck && typeof window !== 'undefined') {
    const tenantId = localStorage.getItem('kestrel_active_tenant_v1');
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Include cookies for cookie-based auth
    });

    // Handle 401 Unauthorized - emit IPC event instead of redirect
    if (response.status === 401) {
      console.warn('[API_CLIENT] 401 Unauthorized - emitting auth-required event');
      
      if (typeof window !== 'undefined' && window.desktopAPI) {
        // Emit IPC event to show desktop auth modal
        window.desktopAPI.showNotification({
          title: 'Session Expired',
          body: 'Please sign in again to continue.',
        });
        
        // Send event to renderer to show auth modal
        window.dispatchEvent(new CustomEvent('auth-required'));
      }
      
      throw new Error('Unauthorized - Session expired');
    }

    // Check for other error responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('[API_CLIENT] API call failed:', error);
    throw error;
  }
}

/**
 * Safe fetch wrapper with error handling
 * Similar to web app's safeFetch but adapted for desktop
 */
export async function safeFetch(
  url: string,
  options: ApiCallOptions = {}
): Promise<unknown> {
  const response = await apiCall(url, options);
  
  // Block HTML responses
  const text = await response.text();
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    throw new Error('Received HTML response instead of JSON');
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Failed to parse JSON response');
  }
}
