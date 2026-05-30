import * as SecureStore from 'expo-secure-store';

// ⚙️ Change this to 'https://api.biz499.com' once custom domain is live
export const API_BASE = 'https://biz499-api.amitkumarsingh474.workers.dev';

const TOKEN_KEY = 'biz499_jwt_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = typeof data.error === 'string'
      ? data.error
      : data.error?.message || JSON.stringify(data.error) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

// Auth endpoints
export const api = {
  // Auth
  verifyOtp: (phoneEmailToken: string) =>
    request<{
      token: string;
      user: { id: string; phone: string; fullName: string | null; email: string | null; businessName: string | null; businessCategory: string | null };
      hasProfile: boolean;
      hasOrganization: boolean;
      organization: { id: string; name: string } | null;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token: phoneEmailToken }),
    }),

  updateProfile: (data: { fullName?: string; email?: string; businessName?: string; businessCategory?: string; profilePhoto?: string }) =>
    request('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createOrganization: (name: string) =>
    request('/auth/organization', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getMe: () => request('/auth/me'),

  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  // Meta / Facebook
  getOAuthUrl: (appRedirectUrl?: string) =>
    request<{ url: string; state: string }>(`/meta/oauth-url${appRedirectUrl ? `?appRedirectUrl=${encodeURIComponent(appRedirectUrl)}` : ''}`),

  getMetaStatus: () => request<{ connected: boolean; tokenExpired?: boolean; profile?: { name: string; email: string } }>('/meta/status'),

  getMetaPages: () => request<{ pages: any[] }>('/meta/pages'),

  getMetaAdAccounts: () => request<{ adAccounts: any[] }>('/meta/ad-accounts'),

  disconnectMeta: () => request('/meta/disconnect', { method: 'POST' }),

  removeMetaPage: (pageId: string) => request(`/meta/pages/${pageId}`, { method: 'DELETE' }),

  syncPages: () => request('/meta/sync-pages', { method: 'POST' }),

  getFbCampaigns: (pageId?: string) =>
    request<{ campaigns: any[]; insights: any; adAccountsCount: number }>(
      pageId ? `/meta/fb-campaigns?pageId=${pageId}` : '/meta/fb-campaigns'
    ),

  getFbLeads: (params?: { campaignId?: string; pageId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.campaignId) qs.set('campaignId', params.campaignId);
    if (params?.pageId) qs.set('pageId', params.pageId);
    const query = qs.toString();
    return request<{ leads: any[]; forms: any[]; totalLeads: number; fromCache?: boolean }>(
      query ? `/meta/leads?${query}` : '/meta/leads'
    );
  },

  getFbMessages: () =>
    request<{ messages: any[]; totalMessages: number }>('/meta/messages'),

  // Creatives
  uploadCreative: async (file: { uri: string; name: string; type: string }, orgId?: string) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    if (orgId) formData.append('orgId', orgId);

    const res = await fetch(`${API_BASE}/creatives/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  getCreatives: () => request<{ creatives: any[] }>('/creatives'),

  deleteCreative: (id: string) => request(`/creatives/${id}`, { method: 'DELETE' }),

  getCreativeUrl: (id: string) => `${API_BASE}/creatives/${id}/file`,

  // Campaigns
  createCampaign: (data: any) =>
    request('/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  getCampaigns: (status?: string) =>
    request<{ campaigns: any[] }>(`/campaigns${status ? `?status=${status}` : ''}`),

  getCampaign: (id: string) => request(`/campaigns/${id}`),

  updateCampaign: (id: string, data: any) =>
    request(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  launchCampaign: (id: string) =>
    request(`/campaigns/${id}/launch`, { method: 'POST' }),

  pauseCampaign: (id: string) =>
    request(`/campaigns/${id}/pause`, { method: 'POST' }),

  resumeCampaign: (id: string) =>
    request(`/campaigns/${id}/resume`, { method: 'POST' }),

  deleteCampaign: (id: string) =>
    request(`/campaigns/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalyticsOverview: () => request('/analytics/overview'),

  getCampaignAnalytics: (id: string, days?: number) =>
    request(`/analytics/campaigns/${id}${days ? `?days=${days}` : ''}`),

  syncAnalytics: () => request('/analytics/sync', { method: 'POST' }),

  // Gemini AI proxy
  geminiGenerate: (body: { model?: string; contents: any[]; generationConfig?: any }) =>
    request('/gemini/generate', { method: 'POST', body: JSON.stringify(body) }),

  geminiGenerateImage: (body: { model?: string; contents: any[]; generationConfig?: any }) =>
    request('/gemini/generate-image', { method: 'POST', body: JSON.stringify(body) }),

  // Digital Cards
  saveCard: (data: { cardData: Record<string, string>; templateId: string; slug?: string; imageBase64?: string }) =>
    request<{ id: string; slug: string; url: string; updated: boolean }>(
      '/cards', { method: 'POST', body: JSON.stringify(data) }
    ),

  getMyCard: () => request<{ card: any }>('/cards/mine'),

  deleteMyCard: () => request('/cards/mine', { method: 'DELETE' }),

  // Website Requests
  uploadWebsiteImages: (requestId: string, data: { logo?: string; galleryImages?: string[] }) =>
    request(`/websites/upload-images/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitWebsiteRequest: (data: {
    businessName: string; businessCategory?: string; phone?: string; email?: string;
    websiteType?: string; pagesNeeded?: string[]; description?: string; referenceUrls?: string[];
    designHtml?: string; designData?: string;
  }) => request<{ id: string; status: string; message: string }>(
    '/websites/request', { method: 'POST', body: JSON.stringify(data) }
  ),

  getWebsiteRequests: () => request<{ requests: any[] }>('/websites/request'),

  getWebsiteDesignData: (requestId: string) =>
    request<{ designData: any }>(`/websites/design-data/${requestId}`),

  // Analytics
  trackEvent: (event: string, data?: any) => {
    // Fire and forget — don't block UI
    request('/events/track', {
      method: 'POST',
      body: JSON.stringify({ event, data }),
    }).catch(() => {});
  },

  getAnalyticsDashboard: () => request<any>('/events/dashboard'),
};
