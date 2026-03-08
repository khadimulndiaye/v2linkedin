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
