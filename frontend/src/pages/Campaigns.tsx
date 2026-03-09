import { useEffect, useState } from 'react';
import { campaignsApi, accountsApi, Campaign, Account } from '../lib/api';

const CAMPAIGN_TYPES = [
  { value: 'connection', label: 'Connection Requests' },
  { value: 'message',    label: 'Direct Messages'     },
  { value: 'engagement', label: 'Auto Engagement'     },
  { value: 'content',    label: 'Content Scheduling'  },
];

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-green-100 text-green-700',
  paused:  'bg-yellow-100 text-yellow-700',
  draft:   'bg-gray-100 text-gray-600',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData]   = useState({ name: '', type: 'connection', accountId: '' });
  const [error,    setError]      = useState('');
  const [filter,   setFilter]     = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [camps, accs] = await Promise.all([campaignsApi.list(), accountsApi.list()]);
      setCampaigns(camps);
      setAccounts(accs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await campaignsApi.create(formData);
      setShowModal(false);
      setFormData({ name: '', type: 'connection', accountId: '' });
      await loadData();
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id: string) => {
    try { await campaignsApi.toggle(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try { await campaignsApi.delete(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  const getTypeLabel = (type: string) => CAMPAIGN_TYPES.find((t) => t.value === type)?.label ?? type;
  const getAccountLabel = (c: Campaign) =>
    c.account?.profileName || c.account?.email ||
    accounts.find((a) => a.id === c.accountId)?.email || '—';

  const filtered = filter ? campaigns.filter((c) => c.status === filter) : campaigns;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={accounts.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create Campaign
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-amber-800 text-sm">Add a LinkedIn account first before creating campaigns.</p>
        </div>
      )}

      {/* Filter */}
      {campaigns.length > 0 && (
        <div className="flex gap-2 mb-5">
          {['', 'active', 'paused', 'draft'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
                (filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
              }
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📣</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create a campaign to start automating your LinkedIn outreach.</p>
          {accounts.length > 0 && (
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 leading-tight">{c.name}</h3>
                <span className={'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ' + (STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600')}>
                  {c.status}
                </span>
              </div>

              <div className="space-y-1 mb-4 flex-1">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Type:</span> {getTypeLabel(c.type)}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Account:</span> {getAccountLabel(c)}
                </p>
                {c._count !== undefined && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Leads:</span> {c._count.leads}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(c.id)}
                  className={
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ' +
                    (c.status === 'active'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200')
                  }
                >
                  {c.status === 'active' ? '⏸ Pause' : '▶ Activate'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Create Campaign</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., Q1 Outreach — CTOs"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.profileName || a.email}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
