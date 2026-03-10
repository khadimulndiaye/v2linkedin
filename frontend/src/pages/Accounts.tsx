import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accountsApi, oauthApi, Account } from '../lib/api';

type ConnectionMode = 'manual' | 'oauth' | 'browser';

const MODE_INFO: Record<ConnectionMode, { label: string; icon: string; desc: string; color: string }> = {
  manual: {
    label: 'Manual Only',
    icon:  '📋',
    desc:  'Track this profile manually. No automated actions.',
    color: 'border-gray-200 bg-gray-50',
  },
  oauth: {
    label: 'LinkedIn OAuth',
    icon:  '🔐',
    desc:  'Connect via official LinkedIn API. Can publish posts. Requires LinkedIn Developer App.',
    color: 'border-blue-200 bg-blue-50',
  },
  browser: {
    label: 'Browser Automation',
    icon:  '🤖',
    desc:  'Automate via browser (Puppeteer). Can connect, message, and post. Requires server with Chrome.',
    color: 'border-purple-200 bg-purple-50',
  },
};

function ConnectionBadge({ account }: { account: Account }) {
  const mode = account.connectionMode;
  if (mode === 'oauth' && account.isConnected) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">🔐 OAuth Connected</span>;
  }
  if (mode === 'oauth' && !account.isConnected) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">🔐 OAuth — Not Connected</span>;
  }
  if (mode === 'browser') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">🤖 Browser</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">📋 Manual</span>;
}

export default function Accounts() {
  const [accounts,   setAccounts]   = useState<Account[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [oauthMsg,   setOauthMsg]   = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '', profileName: '', profileUrl: '',
    connectionMode: 'manual' as ConnectionMode,
    password: '', showPassword: false, cookiesJson: '', showCookieInput: false,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback redirect
  useEffect(() => {
    const oauth  = searchParams.get('oauth');
    const reason = searchParams.get('reason');
    if (oauth === 'success') {
      setOauthMsg('✅ LinkedIn account connected successfully via OAuth!');
      setSearchParams({});
      loadAccounts();
    } else if (oauth === 'error') {
      setOauthMsg(`❌ OAuth failed: ${reason || 'Unknown error'}`);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try { setAccounts(await accountsApi.list()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await accountsApi.create({
        email:          formData.email,
        profileName:    formData.profileName  || undefined,
        profileUrl:     formData.profileUrl   || undefined,
        connectionMode: formData.connectionMode,
        password:       formData.connectionMode === 'browser' ? formData.password || undefined : undefined,
        cookiesJson:    formData.connectionMode === 'browser' ? formData.cookiesJson || undefined : undefined,
      });
      setShowModal(false);
      resetForm();
      await loadAccounts();
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleConnectOAuth = async (accountId: string) => {
    setConnectingId(accountId);
    try {
      const { url } = await oauthApi.getLinkedInUrl(accountId);
      // Open in same tab — LinkedIn's OAuth requires same-window redirect
      window.location.href = url;
    } catch (err) {
      setOauthMsg(`❌ ${(err as Error).message}`);
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this OAuth connection? You can reconnect any time.')) return;
    try {
      await oauthApi.disconnect(accountId);
      await loadAccounts();
    } catch (err) { console.error(err); }
  };

  const handleToggleStatus = async (account: Account) => {
    try {
      await accountsApi.update(account.id, {
        status: account.status === 'active' ? 'inactive' : 'active',
      });
      await loadAccounts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account and all associated data?')) return;
    try { await accountsApi.delete(id); await loadAccounts(); }
    catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({ email: '', profileName: '', profileUrl: '', connectionMode: 'manual', password: '', showPassword: false, cookiesJson: '', showCookieInput: false });
    setError('');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage profiles with OAuth API or browser automation.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Account
        </button>
      </div>

      {oauthMsg && (
        <div className={`rounded-xl p-4 mb-5 text-sm font-medium flex justify-between items-center ${oauthMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{oauthMsg}</span>
          <button onClick={() => setOauthMsg('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">👤</div>
          <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Add a LinkedIn account and choose how to connect it — via OAuth API or browser automation.</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(account.profileName || account.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {account.profileName || account.email}
                    </div>
                    <div className="text-xs text-gray-500">{account.email}</div>
                    {account.profileUrl && (
                      <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        View Profile ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Badges + actions */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <ConnectionBadge account={account} />

                  <button
                    onClick={() => handleToggleStatus(account)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {account.status === 'active' ? '● Active' : '○ Inactive'}
                  </button>

                  {/* OAuth Connect / Disconnect */}
                  {account.connectionMode === 'oauth' && (
                    account.isConnected ? (
                      <button onClick={() => handleDisconnect(account.id)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 font-medium">
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectOAuth(account.id)}
                        disabled={connectingId === account.id}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {connectingId === account.id ? 'Redirecting...' : '🔐 Connect OAuth'}
                      </button>
                    )
                  )}

                  <button onClick={() => handleDelete(account.id)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 font-medium">
                    Delete
                  </button>
                </div>
              </div>

              {/* Mode info bar */}
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${MODE_INFO[account.connectionMode].color}`}>
                <span className="font-medium">{MODE_INFO[account.connectionMode].icon} {MODE_INFO[account.connectionMode].label}:</span>{' '}
                {account.connectionMode === 'oauth' && account.oauthExpiresAt && (
                  <span>Token expires {new Date(account.oauthExpiresAt).toLocaleDateString()}. </span>
                )}
                {MODE_INFO[account.connectionMode].desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Account Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add LinkedIn Account</h2>
            <p className="text-gray-500 text-sm mb-5">Choose how this account will connect to LinkedIn.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="your.linkedin@email.com"
                  required
                />
              </div>

              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., My Main Account"
                />
              </div>

              {/* Profile URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={formData.profileUrl}
                  onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              {/* Connection Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Connection Mode</label>
                <div className="space-y-2">
                  {(Object.keys(MODE_INFO) as ConnectionMode[]).map((mode) => {
                    const m = MODE_INFO[mode];
                    return (
                      <label
                        key={mode}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.connectionMode === mode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="connectionMode"
                          value={mode}
                          checked={formData.connectionMode === mode}
                          onChange={() => setFormData({ ...formData, connectionMode: mode, password: '' })}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{m.icon} {m.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* OAuth info */}
              {formData.connectionMode === 'oauth' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <p className="font-semibold mb-1">After saving:</p>
                  <p>Click the <strong>"Connect OAuth"</strong> button on the account to authorize with LinkedIn. You'll be redirected to LinkedIn to grant permission.</p>
                  <p className="mt-1">Requires <code>LINKEDIN_CLIENT_ID</code>, <code>LINKEDIN_CLIENT_SECRET</code>, and <code>LINKEDIN_REDIRECT_URI</code> on the server.</p>
                </div>
              )}

              {/* Browser auth — tabs: cookies (recommended) vs password */}
              {formData.connectionMode === 'browser' && (
                <div className="space-y-3">
                  {/* Tab switcher */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, showCookieInput: true, password: '' })}
                      className={formData.showCookieInput ? 'flex-1 py-2 font-medium transition-colors bg-blue-600 text-white' : 'flex-1 py-2 font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50'}
                    >
                      🍪 Paste Cookies <span className="text-xs opacity-75">(recommended)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, showCookieInput: false, cookiesJson: '' })}
                      className={!formData.showCookieInput ? 'flex-1 py-2 font-medium transition-colors bg-blue-600 text-white' : 'flex-1 py-2 font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50'}
                    >
                      🔑 Password
                    </button>
                  </div>

                  {formData.showCookieInput ? (
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs text-blue-800">
                        <p className="font-semibold mb-1">How to get your cookies:</p>
                        <ol className="list-decimal ml-4 space-y-0.5">
                          <li>Install <strong>Cookie-Editor</strong> Chrome extension</li>
                          <li>Go to <strong>linkedin.com</strong> (while logged in)</li>
                          <li>Click Cookie-Editor → <strong>Export → Export as JSON</strong></li>
                          <li>Paste the JSON below</li>
                        </ol>
                        <p className="mt-1.5">✅ This avoids 2FA phone verification entirely.</p>
                      </div>
                      <textarea
                        value={formData.cookiesJson}
                        onChange={(e) => setFormData({ ...formData, cookiesJson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-28"
                        placeholder='[{"name":"li_at","value":"AQE...","domain":".linkedin.com",...}]'
                        required={formData.showCookieInput}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={formData.showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Your LinkedIn password"
                          required={!formData.showCookieInput}
                        />
                        <button type="button" onClick={() => setFormData({ ...formData, showPassword: !formData.showPassword })}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm">
                          {formData.showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <p className="text-xs text-amber-700 mt-1">⚠️ May trigger phone verification on first run. Use cookies tab to avoid this.</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">🔒 Credentials encrypted with AES-256-GCM before storage.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
