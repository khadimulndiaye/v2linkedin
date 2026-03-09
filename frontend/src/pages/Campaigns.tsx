import { useEffect, useState } from 'react';
import { campaignsApi, accountsApi, Campaign, Account } from '../lib/api';

const CAMPAIGN_TYPES = [
  { value: 'connection', label: 'Connection Requests' },
  { value: 'message', label: 'Direct Messages' },
  { value: 'engagement', label: 'Auto Engagement' },
  { value: 'content', label: 'Content Scheduling' },
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'connection', accountId: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await campaignsApi.create(formData);
      setShowModal(false);
      setFormData({ name: '', type: 'connection', accountId: '' });
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await campaignsApi.toggle(id);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle campaign:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const getCampaignTypeLabel = (type: string) =>
    CAMPAIGN_TYPES.find((t) => t.value === type)?.label ?? type;

  const getAccountLabel = (campaign: Campaign) =>
    campaign.account
      ? campaign.account.profileName || campaign.account.email
      : accounts.find((a) => a.id === campaign.accountId)?.email ?? '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={accounts.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create Campaign
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Please add a LinkedIn account first before creating campaigns.
          </p>
        </div>
      )}

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
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{campaign.name}</h3>
                <span
                  className={
                    'px-2 py-1 rounded text-xs font-medium ' +
                    (campaign.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : campaign.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800')
                  }
                >
                  {campaign.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-1">
                {getCampaignTypeLabel(campaign.type)}
              </p>
              <p className="text-gray-400 text-xs mb-4">
                Account: {getAccountLabel(campaign)}
              </p>
              {campaign._count !== undefined && (
                <p className="text-gray-400 text-xs mb-4">
                  Leads: {campaign._count.leads}
                </p>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggle(campaign.id)}
                  className={
                    'flex-1 py-2 rounded text-sm font-medium ' +
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Campaign</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
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
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  LinkedIn Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.profileName || account.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
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
