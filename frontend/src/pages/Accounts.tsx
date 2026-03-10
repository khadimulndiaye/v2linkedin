import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accountsApi, oauthApi, Account } from '../lib/api';

type ConnectionMode = 'manual' | 'oauth' | 'browser';

const MODE_INFO: Record<ConnectionMode, { label: string; icon: string; desc: string; color: string }> = {
  manual:  { label: 'Manual Only',       icon: '📋', desc: 'Track this profile manually. No automated actions.',                                            color: 'border-gray-200 bg-gray-50'   },
  oauth:   { label: 'LinkedIn OAuth',     icon: '🔐', desc: 'Connect via official LinkedIn API. Can publish posts. Requires LinkedIn Developer App.',       color: 'border-blue-200 bg-blue-50'   },
  browser: { label: 'Browser Automation', icon: '🤖', desc: 'Automate via browser (Puppeteer). Can connect, message, and post. Requires Chrome on server.', color: 'border-purple-200 bg-purple-50'},
};

interface FormState {
  email: string; profileName: string; profileUrl: string;
  connectionMode: ConnectionMode;
  password: string; showPassword: boolean;
  cookiesJson: string; showCookieInput: boolean;
}

const emptyForm = (): FormState => ({
  email: '', profileName: '', profileUrl: '',
  connectionMode: 'manual',
  password: '', showPassword: false,
  cookiesJson: '', showCookieInput: true,
});

function ConnectionBadge({ account }: { account: Account }) {
  if (account.connectionMode === 'oauth' && account.isConnected)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">🔐 OAuth Connected</span>;
  if (account.connectionMode === 'oauth')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">🔐 OAuth — Not Connected</span>;
  if (account.connectionMode === 'browser')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">🤖 Browser</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">📋 Manual</span>;
}

export default function Accounts() {
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [oauthMsg,     setOauthMsg]     = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // modal: 'none' | 'add' | 'edit'
  const [modalMode,   setModalMode]   = useState<'none' | 'add' | 'edit'>('none');
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [formData,    setFormData]    = useState<FormState>(emptyForm());

  const [searchParams, setSearchParams] = useSearchParams();

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

  const openAdd = () => {
    setFormData(emptyForm());
    setError('');
    setModalMode('add');
  };

  const openEdit = (account: Account) => {
    setEditAccount(account);
    setFormData({
      email:          account.email,
      profileName:    account.profileName || '',
      profileUrl:     account.profileUrl  || '',
      connectionMode: (account.connectionMode as ConnectionMode) || 'manual',
      password:       '', showPassword: false,
      cookiesJson:    '', showCookieInput: true,
    });
    setError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('none');
    setEditAccount(null);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await accountsApi.create({
        email:          formData.email,
        profileName:    formData.profileName  || undefined,
        profileUrl:     formData.profileUrl   || undefined,
        connectionMode: formData.connectionMode,
        password:    formData.connectionMode === 'browser' && !formData.showCookieInput ? formData.password    || undefined : undefined,
        cookiesJson: formData.connectionMode === 'browser' &&  formData.showCookieInput ? formData.cookiesJson || undefined : undefined,
      });
      closeModal();
      await loadAccounts();
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const updates: Parameters<typeof accountsApi.update>[1] = {
        profileName:    formData.profileName || undefined,
        profileUrl:     formData.profileUrl  || undefined,
        connectionMode: formData.connectionMode,
      };
      if (formData.connectionMode === 'browser') {
        if (formData.showCookieInput && formData.cookiesJson.trim())
          updates.cookiesJson = formData.cookiesJson.trim();
        if (!formData.showCookieInput && formData.password.trim())
          updates.password = formData.password.trim();
      }
      await accountsApi.update(editAccount!.id, updates);
      closeModal();
      await loadAccounts();
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleConnectOAuth = async (accountId: string) => {
    setConnectingId(accountId);
    try { const { url } = await oauthApi.getLinkedInUrl(accountId); window.location.href = url; }
    catch (err) { setOauthMsg(`❌ ${(err as Error).message}`); setConnectingId(null); }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect OAuth?')) return;
    try { await oauthApi.disconnect(accountId); await loadAccounts(); }
    catch (err) { console.error(err); }
  };

  const handleToggleStatus = async (account: Account) => {
    try {
      await accountsApi.update(account.id, { status: account.status === 'active' ? 'inactive' : 'active' });
      await loadAccounts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account and all associated data?')) return;
    try { await accountsApi.delete(id); await loadAccounts(); }
    catch (err) { console.error(err); }
  };

  if (loading)
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const isEditing = modalMode === 'edit';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage profiles with OAuth API or browser automation.</p>
        </div>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Account
        </button>
      </div>

      {/* OAuth flash message */}
      {oauthMsg && (
        <div className={`rounded-xl p-4 mb-5 text-sm font-medium flex justify-between items-center ${oauthMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{oauthMsg}</span>
          <button onClick={() => setOauthMsg('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">👤</div>
          <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Add a LinkedIn account and choose how to connect it.</p>
          <button onClick={openAdd} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
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
                    <div className="font-semibold text-gray-900 truncate">{account.profileName || account.email}</div>
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

                  {account.connectionMode === 'oauth' && (
                    account.isConnected ? (
                      <button onClick={() => handleDisconnect(account.id)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 font-medium">
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={() => handleConnectOAuth(account.id)} disabled={connectingId === account.id}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium disabled:opacity-50">
                        {connectingId === account.id ? 'Redirecting...' : '🔐 Connect OAuth'}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => openEdit(account)}
                    className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs hover:bg-amber-100 font-medium"
                  >
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(account.id)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 font-medium">
                    Delete
                  </button>
                </div>
              </div>

              {/* Mode info bar */}
              <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${MODE_INFO[account.connectionMode as ConnectionMode]?.color || 'bg-gray-50'}`}>
                <span className="font-medium">
                  {MODE_INFO[account.connectionMode as ConnectionMode]?.icon} {MODE_INFO[account.connectionMode as ConnectionMode]?.label}:
                </span>{' '}
                {account.connectionMode === 'oauth' && account.oauthExpiresAt && (
                  <span>Token expires {new Date(account.oauthExpiresAt).toLocaleDateString()}. </span>
                )}
                {MODE_INFO[account.connectionMode as ConnectionMode]?.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex justify-between items-start mb-1">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? '✏️ Edit Account' : 'Add LinkedIn Account'}
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  {isEditing
                    ? `Updating: ${editAccount?.profileName || editAccount?.email}`
                    : 'Choose how this account will connect to LinkedIn.'}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl ml-4">✕</button>
            </div>

            {/* Refresh-cookies banner when editing a browser account */}
            {isEditing && editAccount?.connectionMode === 'browser' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-3 mb-1 text-xs text-amber-800">
                <p className="font-semibold">🍪 Paste fresh cookies to fix fetch errors</p>
                <p className="mt-0.5">If auto-fetch returns "session expired", scroll to the Cookies tab below and paste new ones from your browser.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-3 text-sm">{error}</div>
            )}

            <form onSubmit={isEditing ? handleEdit : handleCreate} className="space-y-5 mt-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Email {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isEditing ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                  placeholder="your.linkedin@email.com"
                  readOnly={isEditing}
                  required={!isEditing}
                />
                {isEditing && <p className="text-xs text-gray-400 mt-1">Email cannot be changed after creation.</p>}
              </div>

              {/* Display name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input type="text" value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., My Main Account" />
              </div>

              {/* Profile URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL</label>
                <input type="url" value={formData.profileUrl}
                  onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://linkedin.com/in/yourprofile" />
              </div>

              {/* Connection Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Connection Mode</label>
                <div className="space-y-2">
                  {(Object.keys(MODE_INFO) as ConnectionMode[]).map((mode) => {
                    const m = MODE_INFO[mode];
                    return (
                      <label key={mode}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.connectionMode === mode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="connectionMode" value={mode}
                          checked={formData.connectionMode === mode}
                          onChange={() => setFormData({ ...formData, connectionMode: mode, password: '', cookiesJson: '' })}
                          className="mt-0.5 text-blue-600" />
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
                  <p>Click <strong>"Connect OAuth"</strong> on the account card to authorize with LinkedIn.</p>
                  <p className="mt-1">Requires <code>LINKEDIN_CLIENT_ID</code>, <code>LINKEDIN_CLIENT_SECRET</code>, and <code>LINKEDIN_REDIRECT_URI</code> on the server.</p>
                </div>
              )}

              {/* Browser: Cookies or Password */}
              {formData.connectionMode === 'browser' && (
                <div className="space-y-3">
                  {/* Tab switcher */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    <button type="button"
                      onClick={() => setFormData({ ...formData, showCookieInput: true, password: '' })}
                      className={formData.showCookieInput
                        ? 'flex-1 py-2 font-semibold bg-blue-600 text-white'
                        : 'flex-1 py-2 font-medium bg-white text-gray-600 hover:bg-gray-50'}>
                      🍪 Paste Cookies <span className="text-xs opacity-80">(recommended)</span>
                    </button>
                    <button type="button"
                      onClick={() => setFormData({ ...formData, showCookieInput: false, cookiesJson: '' })}
                      className={!formData.showCookieInput
                        ? 'flex-1 py-2 font-semibold bg-blue-600 text-white'
                        : 'flex-1 py-2 font-medium bg-white text-gray-600 hover:bg-gray-50'}>
                      🔑 Password
                    </button>
                  </div>

                  {/* Cookies pane */}
                  {formData.showCookieInput ? (
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs text-blue-800">
                        <p className="font-semibold mb-1">How to get your cookies:</p>
                        <ol className="list-decimal ml-4 space-y-0.5">
                          <li>Install <strong>Cookie-Editor</strong> Chrome extension</li>
                          <li>Go to <strong>linkedin.com</strong> while logged in</li>
                          <li>Click Cookie-Editor → <strong>Export → Export as JSON</strong></li>
                          <li>Paste the JSON below</li>
                        </ol>
                        <p className="mt-1.5">✅ No phone verification. Works even with 2FA.</p>
                        {isEditing && (
                          <p className="mt-1 font-semibold text-amber-700">← Leave blank to keep existing cookies. Paste new ones to replace.</p>
                        )}
                      </div>
                      <textarea
                        value={formData.cookiesJson}
                        onChange={(e) => setFormData({ ...formData, cookiesJson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-28"
                        placeholder='[{"name":"li_at","value":"AQE...","domain":".linkedin.com",...}]'
                        required={formData.showCookieInput && !isEditing}
                      />
                    </div>
                  ) : (
                    /* Password pane */
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn Password {!isEditing && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={formData.showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder={isEditing ? 'Leave blank to keep existing password' : 'Your LinkedIn password'}
                          required={!formData.showCookieInput && !isEditing}
                        />
                        <button type="button"
                          onClick={() => setFormData({ ...formData, showPassword: !formData.showPassword })}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm">
                          {formData.showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <p className="text-xs text-amber-700 mt-1">⚠️ May trigger phone verification. Use 🍪 Cookies tab to avoid this.</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">🔒 Credentials encrypted with AES-256-GCM before storage.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : isEditing ? '💾 Save Changes' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
