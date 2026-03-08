<<<<<<< Updated upstream
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
=======
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
>>>>>>> Stashed changes
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
<<<<<<< Updated upstream
      ...(token && { Authorization: `Bearer ${token}` }),
=======
      ...(token && { Authorization: 'Bearer ' + token }),
>>>>>>> Stashed changes
      ...options.headers,
    },
  };

<<<<<<< Updated upstream
  const response = await fetch(`${API_URL}${endpoint}`, config);
=======
  const response = await fetch(API_URL + endpoint, config);
>>>>>>> Stashed changes
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  
  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
<<<<<<< Updated upstream
    fetchAPI('/api/auth/login', {
=======
    fetchAPI<{ token: string; user: { id: string; email: string; name: string } }>('/api/auth/login', {
>>>>>>> Stashed changes
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    
  register: (email: string, password: string, name: string) =>
<<<<<<< Updated upstream
    fetchAPI('/api/auth/register', {
=======
    fetchAPI<{ token: string; user: { id: string; email: string; name: string } }>('/api/auth/register', {
>>>>>>> Stashed changes
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

<<<<<<< Updated upstream
  getProfile: () => fetchAPI('/api/auth/profile'),
  
  updateProfile: (data: { name?: string; password?: string }) =>
    fetchAPI('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
=======
  getProfile: () => fetchAPI<{ id: string; email: string; name: string }>('/api/auth/profile'),
>>>>>>> Stashed changes
};

// Accounts API
export const accountsApi = {
<<<<<<< Updated upstream
  list: () => fetchAPI('/api/accounts'),
  
  get: (id: string) => fetchAPI(`/api/accounts/${id}`),
  
  create: (data: { linkedinEmail: string; linkedinPassword: string; name?: string }) =>
    fetchAPI('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    fetchAPI(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  delete: (id: string) =>
    fetchAPI(`/api/accounts/${id}`, { method: 'DELETE' }),
=======
  list: () => fetchAPI<Account[]>('/api/accounts'),
  get: (id: string) => fetchAPI<Account>('/api/accounts/' + id),
  create: (data: { linkedinEmail: string; linkedinPassword: string; name?: string }) =>
    fetchAPI<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    fetchAPI<Account>('/api/accounts/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>('/api/accounts/' + id, { method: 'DELETE' }),
>>>>>>> Stashed changes
};

// Campaigns API
export const campaignsApi = {
  list: (accountId?: string) =>
<<<<<<< Updated upstream
    fetchAPI(`/api/campaigns${accountId ? `?accountId=${accountId}` : ''}`),
    
  get: (id: string) => fetchAPI(`/api/campaigns/${id}`),
  
  create: (data: {
    name: string;
    type: string;
    accountId: string;
    settings?: object;
    scheduledAt?: string;
  }) =>
    fetchAPI('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  update: (id: string, data: { name?: string; status?: string; settings?: object }) =>
    fetchAPI(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  toggle: (id: string, status: string) =>
    fetchAPI(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    
  delete: (id: string) =>
    fetchAPI(`/api/campaigns/${id}`, { method: 'DELETE' }),
=======
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
>>>>>>> Stashed changes
};

// Leads API
export const leadsApi = {
<<<<<<< Updated upstream
  list: (params?: { accountId?: string; status?: string; tags?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.accountId) searchParams.append('accountId', params.accountId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.tags) searchParams.append('tags', params.tags);
    const query = searchParams.toString();
    return fetchAPI(`/api/leads${query ? `?${query}` : ''}`);
  },
  
  get: (id: string) => fetchAPI(`/api/leads/${id}`),
  
  create: (data: {
    linkedinUrl: string;
    accountId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    title?: string;
    tags?: string[];
  }) =>
    fetchAPI('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  update: (id: string, data: { status?: string; notes?: string; tags?: string[] }) =>
    fetchAPI(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  delete: (id: string) =>
    fetchAPI(`/api/leads/${id}`, { method: 'DELETE' }),
  
  connect: (id: string) =>
    fetchAPI(`/api/leads/${id}/connect`, { method: 'POST' }),
=======
  list: (params?: { accountId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.accountId) searchParams.append('accountId', params.accountId);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return fetchAPI<Lead[]>('/api/leads' + (query ? '?' + query : ''));
  },
  get: (id: string) => fetchAPI<Lead>('/api/leads/' + id),
  create: (data: { linkedinUrl: string; accountId: string; firstName?: string; lastName?: string; company?: string; title?: string }) =>
    fetchAPI<Lead>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { status?: string; notes?: string }) =>
    fetchAPI<Lead>('/api/leads/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<{ success: boolean }>('/api/leads/' + id, { method: 'DELETE' }),
>>>>>>> Stashed changes
};

// AI API
export const aiApi = {
  generate: (data: { prompt: string; type: string; provider?: string }) =>
<<<<<<< Updated upstream
    fetchAPI('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  improve: (data: { content: string; instruction: string; provider?: string }) =>
    fetchAPI('/api/ai/improve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  ideas: (data: { topic: string; count?: number; provider?: string }) =>
    fetchAPI('/api/ai/ideas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Default export for backward compatibility
export const api = {
  auth: authApi,
  accounts: accountsApi,
  campaigns: campaignsApi,
  leads: leadsApi,
  ai: aiApi,
=======
    fetchAPI<{ content: string }>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  improve: (data: { content: string; instruction: string; provider?: string }) =>
    fetchAPI<{ content: string }>('/api/ai/improve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
>>>>>>> Stashed changes
};

// Types
export interface Account {
  id: string;
  name: string;
  linkedinEmail: string;
  isActive: boolean;
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
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  status: string;
  notes?: string;
  accountId: string;
  createdAt: string;
}
