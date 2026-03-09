import os

FRONTEND_FILES = {
    # Package configuration
    "package.json": '''{
  "name": "linkedin-manager-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}''',

    # Vite config
    "vite.config.ts": '''import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
''',

    # TypeScript config
    "tsconfig.json": '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}''',

    "tsconfig.node.json": '''{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}''',

    # Tailwind config
    "tailwind.config.js": '''/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
''',

    # PostCSS config
    "postcss.config.js": '''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
''',

    # HTML entry point
    "index.html": '''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LinkedIn Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
''',

    # Vite env types
    "src/vite-env.d.ts": '''/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
''',

    # Main entry
    "src/main.tsx": '''import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
''',

    # Global styles
    "src/index.css": '''@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
''',

    # App component with router
    "src/App.tsx": '''import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Campaigns from './pages/Campaigns';
import Leads from './pages/Leads';
import AIContent from './pages/AIContent';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="leads" element={<Leads />} />
          <Route path="ai" element={<AIContent />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
''',

    # API client
    "src/lib/api.ts": '''const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  getProfile: () => fetchAPI<{ id: string; email: string; name: string }>('/api/auth/profile'),
};

// Accounts API
export const accountsApi = {
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
''',

    # Auth store
    "src/store/authStore.ts": '''import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.token);
      set({ user: response.user, token: response.token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(email, password, name);
      localStorage.setItem('token', response.token);
      set({ user: response.user, token: response.token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    set({ isAuthenticated: !!token, token });
  },
}));
''',

    # Layout component
    "src/components/Layout.tsx": '''import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/accounts', label: 'Accounts', icon: '👤' },
    { to: '/campaigns', label: 'Campaigns', icon: '📣' },
    { to: '/leads', label: 'Leads', icon: '🎯' },
    { to: '/ai', label: 'AI Content', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold">LinkedIn Manager</h1>
        </div>
        <nav className="mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                'flex items-center px-4 py-3 text-sm ' +
                (isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800')
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
''',

    # Login page
    "src/pages/Login.tsx": '''import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">LinkedIn Manager</h1>
        <h2 className="text-xl text-center mb-6">Sign In</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Do not have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
''',

    # Register page
    "src/pages/Register.tsx": '''import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">LinkedIn Manager</h1>
        <h2 className="text-xl text-center mb-6">Create Account</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
''',

    # Dashboard page
    "src/pages/Dashboard.tsx": '''import { useEffect, useState } from 'react';
import { accountsApi, campaignsApi, leadsApi, Account, Campaign, Lead } from '../lib/api';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, campaignsData, leadsData] = await Promise.all([
        accountsApi.list(),
        campaignsApi.list(),
        leadsApi.list(),
      ]);
      setAccounts(accountsData);
      setCampaigns(campaignsData);
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const stats = [
    { label: 'LinkedIn Accounts', value: accounts.length, icon: '👤', color: 'bg-blue-500' },
    { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length, icon: '📣', color: 'bg-green-500' },
    { label: 'Total Leads', value: leads.length, icon: '🎯', color: 'bg-purple-500' },
    { label: 'Connected Leads', value: leads.filter(l => l.status === 'connected').length, icon: '🤝', color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={'w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl ' + stat.color}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-gray-500">No campaigns yet</p>
          ) : (
            <ul className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">{campaign.name}</span>
                  <span className={'px-2 py-1 rounded text-xs ' + 
                    (campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                  }>
                    {campaign.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
          {leads.length === 0 ? (
            <p className="text-gray-500">No leads yet</p>
          ) : (
            <ul className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <span className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </span>
                    {lead.company && (
                      <span className="text-gray-500 text-sm ml-2">@ {lead.company}</span>
                    )}
                  </div>
                  <span className={'px-2 py-1 rounded text-xs ' + 
                    (lead.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
                  }>
                    {lead.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
''',

    # Accounts page
    "src/pages/Accounts.tsx": '''import { useEffect, useState } from 'react';
import { accountsApi, Account } from '../lib/api';

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ linkedinEmail: '', linkedinPassword: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await accountsApi.create(formData);
      setShowModal(false);
      setFormData({ linkedinEmail: '', linkedinPassword: '', name: '' });
      loadAccounts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await accountsApi.delete(id);
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await accountsApi.update(id, { isActive: !isActive });
      loadAccounts();
    } catch (error) {
      console.error('Failed to toggle account:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">LinkedIn Accounts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No LinkedIn accounts added yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{account.name || 'Unnamed'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{account.linkedinEmail}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(account.id, account.isActive)}
                      className={'px-3 py-1 rounded text-sm ' +
                        (account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }
                    >
                      {account.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add LinkedIn Account</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Main Account"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">LinkedIn Email</label>
                <input
                  type="email"
                  value={formData.linkedinEmail}
                  onChange={(e) => setFormData({ ...formData, linkedinEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">LinkedIn Password</label>
                <input
                  type="password"
                  value={formData.linkedinPassword}
                  onChange={(e) => setFormData({ ...formData, linkedinPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
''',

    # Campaigns page
    "src/pages/Campaigns.tsx": '''import { useEffect, useState } from 'react';
import { campaignsApi, accountsApi, Campaign, Account } from '../lib/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'connection', accountId: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [campaignsData, accountsData] = await Promise.all([
        campaignsApi.list(),
        accountsApi.list(),
      ]);
      setCampaigns(campaignsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await campaignsApi.create(formData);
      setShowModal(false);
      setFormData({ name: '', type: 'connection', accountId: '' });
      loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await campaignsApi.update(id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Failed to update campaign:', error);
    }
  };

  const campaignTypes = [
    { value: 'connection', label: 'Connection Requests' },
    { value: 'message', label: 'Direct Messages' },
    { value: 'post', label: 'Scheduled Posts' },
    { value: 'engagement', label: 'Auto Engagement' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={accounts.length === 0}
        >
          + Create Campaign
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Please add a LinkedIn account first before creating campaigns.</p>
        </div>
      ) : null}

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No campaigns created yet</p>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Your First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{campaign.name}</h3>
                <span className={'px-2 py-1 rounded text-xs ' +
                  (campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                }>
                  {campaign.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Type: {campaignTypes.find(t => t.value === campaign.type)?.label || campaign.type}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                  className={'flex-1 py-2 rounded text-sm ' +
                    (campaign.status === 'active' 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200')
                  }
                >
                  {campaign.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Campaign</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Campaign Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {campaignTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">LinkedIn Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.linkedinEmail}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
''',

    # Leads page
    "src/pages/Leads.tsx": '''import { useEffect, useState } from 'react';
import { leadsApi, accountsApi, Lead, Account } from '../lib/api';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    linkedinUrl: '',
    accountId: '',
    firstName: '',
    lastName: '',
    company: '',
    title: '',
  });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ accountId: '', status: '' });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [leadsData, accountsData] = await Promise.all([
        leadsApi.list(filter.accountId || filter.status ? filter : undefined),
        accountsApi.list(),
      ]);
      setLeads(leadsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await leadsApi.create(formData);
      setShowModal(false);
      setFormData({ linkedinUrl: '', accountId: '', firstName: '', lastName: '', company: '', title: '' });
      loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadsApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await leadsApi.update(id, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const statusOptions = ['new', 'contacted', 'connected', 'replied', 'qualified', 'converted'];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={accounts.length === 0}
        >
          + Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex space-x-4">
          <select
            value={filter.accountId}
            onChange={(e) => setFilter({ ...filter, accountId: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name || account.linkedinEmail}
              </option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No leads found</p>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Your First Lead
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                    <a 
                      href={lead.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm hover:underline"
                    >
                      View Profile
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.company || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.title || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Lead</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="https://linkedin.com/in/username"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">LinkedIn Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.linkedinEmail}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
''',

    # AI Content page
    "src/pages/AIContent.tsx": '''import { useState } from 'react';
import { aiApi } from '../lib/api';

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<'generate' | 'improve'>('generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    type: 'post',
    provider: 'openai',
  });

  const [improveForm, setImproveForm] = useState({
    content: '',
    instruction: '',
    provider: 'openai',
  });

  const contentTypes = [
    { value: 'post', label: 'LinkedIn Post' },
    { value: 'article', label: 'Article' },
    { value: 'comment', label: 'Comment' },
    { value: 'message', label: 'Direct Message' },
    { value: 'connection', label: 'Connection Request' },
  ];

  const providers = [
    { value: 'openai', label: 'OpenAI GPT' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'deepseek', label: 'DeepSeek' },
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await aiApi.generate(generateForm);
      setResult(response.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await aiApi.improve(improveForm);
      setResult(response.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Content Generator</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={'px-4 py-2 rounded ' +
            (activeTab === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')
          }
        >
          Generate Content
        </button>
        <button
          onClick={() => setActiveTab('improve')}
          className={'px-4 py-2 rounded ' +
            (activeTab === 'improve' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')
          }
        >
          Improve Content
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'generate' ? (
            <form onSubmit={handleGenerate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Content Type</label>
                <select
                  value={generateForm.type}
                  onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {contentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">AI Provider</label>
                <select
                  value={generateForm.provider}
                  onChange={(e) => setGenerateForm({ ...generateForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Prompt</label>
                <textarea
                  value={generateForm.prompt}
                  onChange={(e) => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-32"
                  placeholder="Describe what you want to write about..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Content'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleImprove}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">AI Provider</label>
                <select
                  value={improveForm.provider}
                  onChange={(e) => setImproveForm({ ...improveForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Your Content</label>
                <textarea
                  value={improveForm.content}
                  onChange={(e) => setImproveForm({ ...improveForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-32"
                  placeholder="Paste your content here..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Improvement Instructions</label>
                <textarea
                  value={improveForm.instruction}
                  onChange={(e) => setImproveForm({ ...improveForm, instruction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-20"
                  placeholder="e.g., Make it more professional, add a call to action..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Improving...' : 'Improve Content'}
              </button>
            </form>
          )}
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Result</h2>
            {result && (
              <button
                onClick={copyToClipboard}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Copy to Clipboard
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : result ? (
            <div className="bg-gray-50 rounded p-4 whitespace-pre-wrap h-64 overflow-y-auto">
              {result}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Generated content will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
''',

    # .gitignore
    ".gitignore": '''node_modules
dist
.env
.env.local
*.log
.DS_Store
''',

    # Environment example
    ".env.example": '''VITE_API_URL=http://localhost:3001
''',
}


def create_frontend(base_path: str = "frontend"):
    """Create the frontend project structure."""
    import os

    if os.path.exists(base_path):
        response = input("Directory '" + base_path + "' exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return False

    print("Creating frontend project...")

    for file_path, content in FRONTEND_FILES.items():
        full_path = os.path.join(base_path, file_path)
        dir_path = os.path.dirname(full_path)

        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print("Created directory: " + dir_path)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Created: " + full_path)

    print("\n" + "=" * 50)
    print("Frontend created successfully!")
    print("=" * 50)
    print("\nNext steps:")
    print("1. cd " + base_path)
    print("2. npm install")
    print("3. npm run dev")
    print("\nFor production build:")
    print("npm run build")
    print("\nDeploy to Netlify with:")
    print("  Base directory: frontend")
    print("  Build command: npm run build")
    print("  Publish directory: frontend/dist")
    print("  Environment: VITE_API_URL=https://linkedin-manager-api.onrender.com")

    return True


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "frontend"
    create_frontend(path)