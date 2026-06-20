/**
 * Desktop API Client
 * 
 * This is a specialized API client for the desktop application.
 * Unlike the web app's api-client.ts which uses relative URLs and cookie auth,
 * this client uses:
 * - Absolute URLs to the hosted backend
 * - Bearer token authentication (Authorization header)
 * - x-tenant-id header for tenant resolution
 * 
 * This aligns with the backend changes made in Phase 0:
 * - frontend/lib/supabase/server-from-header.ts (createClientFromHeader)
 * - frontend/lib/auth/resolveTenant.ts (x-tenant-id fallback)
 * - frontend/app/api/meeting/route.ts (proxy route)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://app.kestrel.com';

interface DesktopApiClientConfig {
  token: string;
  tenantId: string;
}

class DesktopApiClient {
  private token: string;
  private tenantId: string;

  constructor(config: DesktopApiClientConfig) {
    this.token = config.token;
    this.tenantId = config.tenantId;
  }

  /**
   * Update auth credentials
   */
  updateCredentials(token: string, tenantId: string) {
    this.token = token;
    this.tenantId = tenantId;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'x-tenant-id': this.tenantId,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Contacts API
   */
  async getContacts() {
    return this.get('/api/contacts');
  }

  async createContact(data: unknown) {
    return this.post('/api/contacts', data);
  }

  async updateContact(id: string, data: unknown) {
    return this.put(`/api/contacts/${id}`, data);
  }

  async deleteContact(id: string) {
    return this.delete(`/api/contacts/${id}`);
  }

  /**
   * Calls API
   */
  async getCalls() {
    return this.get('/api/calls');
  }

  async getCall(callSid: string) {
    return this.get(`/api/calls/${callSid}`);
  }

  /**
   * SMS API
   */
  async getMessages() {
    return this.get('/api/sms');
  }

  async sendMessage(data: unknown) {
    return this.post('/api/sms', data);
  }

  /**
   * Meeting Dialer API (proxied through backend)
   */
  async dialMeeting(data: unknown) {
    return this.post('/api/meeting/dial', data);
  }

  /**
   * Dashboard API
   */
  async getDashboardStats() {
    return this.get('/api/dashboard/consolidated');
  }

  /**
   * User/Profile API
   */
  async getProfile() {
    return this.get('/api/user/profile');
  }

  async updateProfile(data: unknown) {
    return this.put('/api/user/profile', data);
  }
}

// Singleton instance
let clientInstance: DesktopApiClient | null = null;

/**
 * Get or create the desktop API client singleton
 */
export function getDesktopApiClient(): DesktopApiClient {
  if (!clientInstance) {
    throw new Error('DesktopApiClient not initialized. Call initDesktopApiClient first.');
  }
  return clientInstance;
}

/**
 * Initialize the desktop API client with auth credentials
 */
export function initDesktopApiClient(token: string, tenantId: string): DesktopApiClient {
  clientInstance = new DesktopApiClient({ token, tenantId });
  return clientInstance;
}

/**
 * Reset the desktop API client (for logout)
 */
export function resetDesktopApiClient(): void {
  clientInstance = null;
}
