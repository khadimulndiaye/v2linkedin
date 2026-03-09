import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountsApi, campaignsApi, Account, Campaign } from '../lib/api';

const CAMPAIGN_TYPES = [
  { value: 'connection',  label: 'Connection Outreach',  icon: '🤝', desc: 'Send connection requests to prospects' },
  { value: 'message',     label: 'Message Campaign',     icon: '💬', desc: 'Send messages to 1st connections' },
  { value: 'content',     label: 'Content & Posting',    icon: '📝', desc: 'Schedule and publish posts' },
  { value: 'mixed',       label: 'Mixed',                icon: '🎯', desc: 'Combine connections, messages, and posts' },
];

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-green-100 text-green-700',
  paused:  'bg-yellow-100 text-yellow-700',
  draft:   'bg-gray-100 text-gray-600',
  completed:'bg-blue-100 text-blue-700',
};

export default function Campaigns() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [accounts,   setAccounts]   = useState<Account[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', type: 'connection', accountId: '', description: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [camps, accs] = await Promise.all([campaignsApi.list(), accountsApi.list()]);
      setCampaigns(camps);
      setAccounts(accs.filter((a) => a.status === 'active'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const campaign = await campaignsApi.create({
        name:      form.name,
        type:      form.type,
        accountId: form.accountId,
        settings:  form.description ? { description: form.description } : {},
      });
      setShowModal(false);
      resetForm();
      await loadData();

      // Offer to add leads immediately
      if (confirm(`Campaign "${campaign.name}" created! Add leads to it now?`)) {
        navigate(`/leads?campaignId=${campaign.id}`);
      }
    } catch (err) { setError((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id: string) => {
    try { await campaignsApi.toggle(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    try { await campaignsApi.delete(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setForm({ name: '', type: 'connection', accountId: '', description: '' });
    setError('');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">Organise your outreach into targeted campaigns.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + New Campaign
        </button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/posts" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-semibold text-sm text-gray-800">Publish a Post</p>
            <p className="text-xs text-gray-400">Schedule or post now to LinkedIn</p>
          </div>
        </Link>
        <Link to="/leads" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-sm text-gray-800">Add Leads</p>
            <p className="text-xs text-gray-400">Add LinkedIn profiles to a campaign</p>
          </div>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📣</div>
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Create your first campaign to start organizing your LinkedIn outreach.</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const typeInfo = CAMPAIGN_TYPES.find((t) => t.value === campaign.type);
            return (
              <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{typeInfo?.icon ?? '📣'}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
                      <p className="text-xs text-gray-400">
                        {campaign.account?.profileName || campaign.account?.email || '—'}
                        {' · '}
                        {typeInfo?.label || campaign.type}
                        {' · '}
                        {campaign._count?.leads ?? 0} leads
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {campaign.status}
                    </span>

                    {/* Add leads to this campaign */}
                    <Link
                      to={`/leads?campaignId=${campaign.id}`}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 font-medium"
                    >
                      + Leads
                    </Link>

                    {/* Publish post for this campaign's account */}
                    {campaign.accountId && (
                      <Link
                        to={`/posts?accountId=${campaign.accountId}`}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 font-medium"
                      >
                        📝 Post
                      </Link>
                    )}

                    <button
                      onClick={() => handleToggle(campaign.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        campaign.status === 'active'
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {campaign.status === 'active' ? 'Pause' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleDelete(campaign.id, campaign.name)}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Campaign Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">New Campaign</h2>
            <p className="text-gray-500 text-sm mb-5">Define your campaign goal and link it to a LinkedIn account.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q2 SaaS Founders Outreach"
                  required
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Account <span className="text-red-500">*</span></label>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.connectionMode === 'oauth' ? '🔐' : a.connectionMode === 'browser' ? '🤖' : '📋'}{' '}
                      {a.profileName || a.email}
                    </option>
                  ))}
                  {accounts.length === 0 && <option disabled>No active accounts — add one first</option>}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPAIGN_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-start gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        form.type === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t.value}
                        checked={form.type === t.value}
                        onChange={() => setForm({ ...form, type: t.value })}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{t.icon} {t.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  placeholder="Target audience, goals, messaging strategy..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || accounts.length === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
