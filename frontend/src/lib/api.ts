const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: 'Bearer ' + token }),
      ...options.headers,
    },
  };

  const response = await fetch(API_URL + endpoint, config);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || err.message || 'Request failed');
  }

  return response.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    fetchAPI<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    fetchAPI<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getProfile: () => fetchAPI<AuthUser>('/api/auth/me'),

  updateProfile: (data: { name?: string }) =>
    fetchAPI<AuthUser>('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Accounts ────────────────────────────────────────────────────────────────

export const accountsApi = {
  list: () => fetchAPI<Account[]>('/api/accounts'),

  get: (id: string) => fetchAPI<Account>('/api/accounts/' + id),

  create: (data: { email: string; profileName?: string; profileUrl?: string }) =>
    fetchAPI<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { profileName?: string; profileUrl?: string; status?: string }) =>
    fetchAPI<Account>('/api/accounts/' + id, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean; message: string }>('/api/accounts/' + id, { method: 'DELETE' }),
};

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaignsApi = {
  list: (filters?: { status?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (filters?.status) p.append('status', filters.status);
    if (filters?.type)   p.append('type',   filters.type);
    const q = p.toString();
    return fetchAPI<Campaign[]>('/api/campaigns' + (q ? '?' + q : ''));
  },

  get: (id: string) => fetchAPI<Campaign>('/api/campaigns/' + id),

  create: (data: { name: string; type: string; accountId: string; settings?: object }) =>
    fetchAPI<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; status?: string; settings?: object }) =>
    fetchAPI<Campaign>('/api/campaigns/' + id, { method: 'PUT', body: JSON.stringify(data) }),

  toggle: (id: string) =>
    fetchAPI<Campaign>('/api/campaigns/' + id + '/toggle', { method: 'PATCH' }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean; message: string }>('/api/campaigns/' + id, { method: 'DELETE' }),
};

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: { search?: string; status?: string; campaignId?: string; page?: number; limit?: number }): Promise<LeadsResponse> => {
    const p = new URLSearchParams();
    if (params?.search)     p.append('search',     params.search);
    if (params?.status)     p.append('status',     params.status);
    if (params?.campaignId) p.append('campaignId', params.campaignId);
    if (params?.page)       p.append('page',       String(params.page));
    if (params?.limit)      p.append('limit',      String(params.limit));
    const q = p.toString();
    return fetchAPI<LeadsResponse>('/api/leads' + (q ? '?' + q : ''));
  },

  get: (id: string) => fetchAPI<Lead>('/api/leads/' + id),

  create: (data: {
    linkedinUrl: string;
    name: string;
    accountId: string;
    campaignId?: string;
    headline?: string;
    company?: string;
    location?: string;
  }) =>
    fetchAPI<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { status?: string; notes?: string }) =>
    fetchAPI<Lead>('/api/leads/' + id, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean; message: string }>('/api/leads/' + id, { method: 'DELETE' }),
};

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiApi = {
  generate: (data: { prompt: string; type: 'post' | 'comment' | 'message' }) =>
    fetchAPI<{ content: string }>('/api/ai/generate', { method: 'POST', body: JSON.stringify(data) }),

  // Now hits the real /api/ai/improve route on the backend
  improve: (data: { content: string; instruction: string }) =>
    fetchAPI<{ content: string }>('/api/ai/improve', { method: 'POST', body: JSON.stringify(data) }),

  ideas: (data: { topic: string; count?: number }) =>
    fetchAPI<{ ideas: string[] }>('/api/ai/ideas', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt?: string;
}

export interface Account {
  id: string;
  userId?: string;
  email: string;
  profileUrl?: string | null;
  profileName?: string | null;
  status: string;
  dailyLimits?: object;
  createdAt: string;
  updatedAt?: string;
  _count?: { campaigns: number; leads: number };
}

export interface Campaign {
  id: string;
  userId?: string;
  accountId: string;
  name: string;
  type: string;
  status: string;
  settings: object;
  createdAt: string;
  updatedAt?: string;
  account?: { email: string; profileName?: string | null };
  _count?: { leads: number };
}

export interface Lead {
  id: string;
  userId?: string;
  accountId: string;
  campaignId?: string | null;
  linkedinUrl: string;
  name: string;
  headline?: string | null;
  company?: string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  campaign?: { name: string } | null;
  account?: { email: string } | null;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
