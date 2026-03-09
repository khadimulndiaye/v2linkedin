import { useEffect, useState } from 'react';
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
      const [accountsData, campaignsData, leadsResponse] = await Promise.all([
        accountsApi.list(),
        campaignsApi.list(),
        leadsApi.list({ limit: 5 }),
      ]);
      setAccounts(accountsData);
      setCampaigns(campaignsData);
      setLeads(leadsResponse.leads);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      label: 'LinkedIn Accounts',
      value: accounts.length,
      icon: '👤',
      color: 'bg-blue-500',
    },
    {
      label: 'Active Campaigns',
      value: campaigns.filter((c) => c.status === 'active').length,
      icon: '📣',
      color: 'bg-green-500',
    },
    {
      label: 'Total Leads',
      value: leads.length,
      icon: '🎯',
      color: 'bg-purple-500',
    },
    {
      label: 'Connected Leads',
      // backend status values: new | contacted | messaged
      value: leads.filter((l) => l.status === 'contacted' || l.status === 'messaged').length,
      icon: '🤝',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div
                className={
                  'w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl ' +
                  stat.color
                }
              >
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
            <p className="text-gray-500 text-sm">No campaigns yet</p>
          ) : (
            <ul className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{campaign.name}</span>
                    {campaign.account && (
                      <p className="text-xs text-gray-400">
                        {campaign.account.profileName || campaign.account.email}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (campaign.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800')
                    }
                  >
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
            <p className="text-gray-500 text-sm">No leads yet</p>
          ) : (
            <ul className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{lead.name}</span>
                    {lead.company && (
                      <span className="text-gray-500 text-sm ml-2">@ {lead.company}</span>
                    )}
                    {lead.headline && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">{lead.headline}</p>
                    )}
                  </div>
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (lead.status === 'contacted' || lead.status === 'messaged'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800')
                    }
                  >
                    {lead.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Accounts summary */}
      {accounts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">LinkedIn Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div
                  className={
                    'w-3 h-3 rounded-full flex-shrink-0 ' +
                    (account.status === 'active' ? 'bg-green-500' : 'bg-gray-400')
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {account.profileName || account.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{account.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
