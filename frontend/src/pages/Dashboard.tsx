import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, campaignsApi, leadsApi, Account, Campaign, Lead } from '../lib/api';

export default function Dashboard() {
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [accs, camps, leadsResp] = await Promise.all([
        accountsApi.list(),
        campaignsApi.list(),
        leadsApi.list({ limit: 5 }),
      ]);
      setAccounts(accs);
      setCampaigns(camps);
      setLeads(leadsResp.leads);
    } catch (err) {
      console.error('Dashboard load error:', err);
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
    { label: 'LinkedIn Accounts', value: accounts.length,                                          icon: '👤', color: 'bg-blue-500',   to: '/accounts'  },
    { label: 'Active Campaigns',  value: campaigns.filter((c) => c.status === 'active').length,    icon: '📣', color: 'bg-green-500',  to: '/campaigns' },
    { label: 'Total Leads',       value: campaigns.reduce((s, c) => s + (c._count?.leads ?? 0), 0),icon: '🎯', color: 'bg-purple-500', to: '/leads'     },
    { label: 'Messaged Leads',    value: leads.filter((l) => l.status === 'messaged' || l.status === 'contacted').length, icon: '🤝', color: 'bg-orange-500', to: '/leads' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 ' + stat.color}>
                {stat.icon}
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions when nothing is set up */}
      {accounts.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6 flex items-center gap-4">
          <span className="text-3xl">🚀</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Get started</h3>
            <p className="text-blue-700 text-sm">Add a LinkedIn account to start creating campaigns and managing leads.</p>
          </div>
          <Link to="/accounts" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
            Add Account →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Recent Campaigns</h2>
            <Link to="/campaigns" className="text-blue-600 hover:text-blue-800 text-sm">View all →</Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No campaigns yet</p>
              <Link to="/campaigns" className="text-blue-600 hover:underline text-sm">Create one →</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {campaigns.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.account?.profileName || c.account?.email || '—'} · {c._count?.leads ?? 0} leads
                    </p>
                  </div>
                  <span className={
                    'px-2 py-0.5 rounded-full text-xs font-medium ' +
                    (c.status === 'active' ? 'bg-green-100 text-green-700' :
                     c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-gray-100 text-gray-600')
                  }>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Recent Leads</h2>
            <Link to="/leads" className="text-blue-600 hover:text-blue-800 text-sm">View all →</Link>
          </div>
          {leads.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No leads yet</p>
              <Link to="/leads" className="text-blue-600 hover:underline text-sm">Add one →</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{lead.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">
                      {[lead.headline, lead.company].filter(Boolean).join(' · ') || lead.linkedinUrl}
                    </p>
                  </div>
                  <span className={
                    'px-2 py-0.5 rounded-full text-xs font-medium ' +
                    (lead.status === 'messaged' || lead.status === 'contacted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600')
                  }>
                    {lead.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Accounts bar */}
      {accounts.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Accounts</h2>
            <Link to="/accounts" className="text-blue-600 hover:text-blue-800 text-sm">Manage →</Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + (a.status === 'active' ? 'bg-green-500' : 'bg-gray-300')} />
                <span className="text-sm font-medium text-gray-700">{a.profileName || a.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
