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
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchAPI<{ token: string; user: { id: string; email: string; name: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    fetchAPI<{ token: string; user: { id: string; email: string; name: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getProfile: () => fetchAPI<{ id: string; email: string; name: string }>('/api/auth/me'),

  updateProfile: (data: { name?: string }) =>
    fetchAPI<{ id: string; email: string; name: string }>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Accounts API
export const accountsApi = {
  list: () => fetchAPI<Account[]>('/api/accounts'),
  get: (id: string) => fetchAPI<Account>('/api/accounts/' + id),
  create: (data: { linkedinEmail: string; linkedinPassword?: string; name?: string }) =>
    fetchAPI<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ email: data.linkedinEmail, profileName: data.name }),
    }),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    fetchAPI<Account>('/api/accounts/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        profileName: data.name,
        status: data.isActive === false ? 'inactive' : 'active',
      }),
    }),
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>('/api/accounts/' + id, { method: 'DELETE' }),
};

// Campaigns API
export const campaignsApi = {
  list: (accountId?: string) =>
    fetchAPI<Campaign[]>('/api/campaigns' + (accountId ? '?accountId=' + accountId : '')),
  get: (id: string) => fetchAPI<Campaign>('/api/campaigns/' + id),
  create: (data: { name: string; type: string; accountId: string; settings?: object }) =>
    fetchAPI<Campaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; status?: string; settings?: object }) =>
    fetchAPI<Campaign>('/api/campaigns/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>('/api/campaigns/' + id, { method: 'DELETE' }),
};

// Leads API
export const leadsApi = {
  list: async (params?: { accountId?: string; status?: string }): Promise<Lead[]> => {
    const searchParams = new URLSearchParams();
    if (params?.accountId) searchParams.append('accountId', params.accountId);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    const result = await fetchAPI<{ leads: Lead[]; total: number } | Lead[]>(
      '/api/leads' + (query ? '?' + query : '')
    );
    return Array.isArray(result) ? result : result.leads;
  },
  get: (id: string) => fetchAPI<Lead>('/api/leads/' + id),
  create: (data: {
    linkedinUrl: string;
    accountId: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    title?: string;
  }) =>
    fetchAPI<Lead>('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        linkedinUrl: data.linkedinUrl,
        accountId: data.accountId,
        name: ((data.firstName || '') + ' ' + (data.lastName || '')).trim() || 'Unknown',
        company: data.company,
        headline: data.title,
      }),
    }),
  update: (id: string, data: { status?: string; notes?: string }) =>
    fetchAPI<Lead>('/api/leads/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>('/api/leads/' + id, { method: 'DELETE' }),
};

// AI API
export const aiApi = {
  generate: (data: { prompt: string; type: string; provider?: string }) =>
    fetchAPI<{ content: string }>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  improve: (data: { content: string; instruction: string; provider?: string }) =>
    fetchAPI<{ content: string }>('/api/ai/improve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  ideas: (data: { topic: string; count?: number; provider?: string }) =>
    fetchAPI<{ ideas: string[] }>('/api/ai/ideas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Types
export interface Account {
  id: string;
  name?: string;
  profileName?: string;
  linkedinEmail?: string;
  email?: string;
  isActive?: boolean;
  status?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  accountId: string;
  settings: object;
  createdAt: string;
}

export interface Lead {
  id: string;
  linkedinUrl: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  headline?: string;
  status: string;
  notes?: string;
  accountId: string;
  createdAt: string;
}
