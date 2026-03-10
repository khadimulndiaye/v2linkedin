import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadsApi, accountsApi, campaignsApi, Lead, Account, Campaign } from '../lib/api';

const STATUS_OPTIONS = ['new', 'contacted', 'messaged'];
const STATUS_COLORS: Record<string, string> = {
  new:       'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  messaged:  'bg-green-100 text-green-700',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchRow {
  id:          number;
  linkedinUrl: string;
  name:        string;
  headline:    string;
  company:     string;
  location:    string;
  state:       'idle' | 'fetching' | 'done' | 'error';
  error?:      string;
}

let rowId = 0;
const mkRow = (url = ''): BatchRow => ({
  id: ++rowId, linkedinUrl: url,
  name: '', headline: '', company: '', location: '',
  state: 'idle',
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function Leads() {
  const [searchParams] = useSearchParams();
  const preselectedCampaign = searchParams.get('campaignId') ?? '';

  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState({ search: '', status: '', campaignId: preselectedCampaign });

  // Modal state
  const [modal, setModal] = useState<'none' | 'single' | 'batch'>('none');

  // Single lead form
  const [singleForm, setSingleForm] = useState({
    linkedinUrl: '', name: '', accountId: '', campaignId: preselectedCampaign,
    headline: '', company: '', location: '', fetching: false, error: '',
  });

  // Batch form
  const [batchForm, setBatchForm] = useState({
    accountId:  '',
    campaignId: preselectedCampaign,
    urlInput:   '',     // raw textarea: one URL per line
    rows:       [] as BatchRow[],
    step:       'input' as 'input' | 'review',
    fetching:   false,
    fetchIndex: -1,
    autoFetch:  true,
    submitting: false,
    error:      '',
    successMsg: '',
  });

  useEffect(() => { loadData(); }, [filter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsResp, accs, camps] = await Promise.all([
        leadsApi.list({
          search:     filter.search    || undefined,
          status:     filter.status    || undefined,
          campaignId: filter.campaignId || undefined,
        }),
        accountsApi.list(),
        campaignsApi.list(),
      ]);
      setLeads(leadsResp.leads);
      setTotal(leadsResp.total);
      setAccounts(accs);
      setCampaigns(camps);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filter]);

  // ── Single lead ────────────────────────────────────────────────────────────

  const handleSingleFetch = async () => {
    if (!singleForm.linkedinUrl || !singleForm.accountId) return;
    const account = accounts.find((a) => a.id === singleForm.accountId);
    if (account?.connectionMode !== 'browser') {
      setSingleForm((f) => ({ ...f, error: 'Auto-fetch requires a browser-mode account.' }));
      return;
    }
    setSingleForm((f) => ({ ...f, fetching: true, error: '' }));
    try {
      const data = await leadsApi.scrapeProfile(singleForm.linkedinUrl, singleForm.accountId);
      setSingleForm((f) => ({ ...f, ...data, fetching: false }));
    } catch (err) {
      setSingleForm((f) => ({ ...f, fetching: false, error: (err as Error).message }));
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleForm((f) => ({ ...f, error: '' }));
    try {
      await leadsApi.create({
        linkedinUrl: singleForm.linkedinUrl,
        name:        singleForm.name,
        accountId:   singleForm.accountId,
        campaignId:  singleForm.campaignId || undefined,
        headline:    singleForm.headline || undefined,
        company:     singleForm.company  || undefined,
        location:    singleForm.location || undefined,
      });
      setModal('none');
      setSingleForm({ linkedinUrl: '', name: '', accountId: '', campaignId: preselectedCampaign, headline: '', company: '', location: '', fetching: false, error: '' });
      await loadData();
    } catch (err) {
      setSingleForm((f) => ({ ...f, error: (err as Error).message }));
    }
  };

  // ── Batch ──────────────────────────────────────────────────────────────────

  const parseBatchUrls = () => {
    const lines = batchForm.urlInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http') && l.includes('linkedin.com/in/'));

    if (lines.length === 0) {
      setBatchForm((f) => ({ ...f, error: 'No valid LinkedIn profile URLs found. Each line should start with https://linkedin.com/in/' }));
      return;
    }

    const rows = lines.map((url) => mkRow(url));
    setBatchForm((f) => ({ ...f, rows, step: 'review', error: '' }));
  };

  const fetchBatchProfiles = async () => {
    const { accountId, rows } = batchForm;
    if (!accountId) {
      setBatchForm((f) => ({ ...f, error: 'Select a browser-mode account to auto-fetch profiles.' }));
      return;
    }
    const account = accounts.find((a) => a.id === accountId);
    if (account?.connectionMode !== 'browser') {
      setBatchForm((f) => ({ ...f, error: 'Auto-fetch requires a browser-mode account with a password.' }));
      return;
    }

    setBatchForm((f) => ({ ...f, fetching: true, error: '' }));

    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].name) continue; // already filled manually
      setBatchForm((f) => ({ ...f, fetchIndex: i }));
      updated[i] = { ...updated[i], state: 'fetching' };
      setBatchForm((f) => ({ ...f, rows: [...updated] }));

      try {
        const data = await leadsApi.scrapeProfile(updated[i].linkedinUrl, accountId);
        updated[i] = { ...updated[i], ...data, state: 'done' };
      } catch (err) {
        updated[i] = { ...updated[i], state: 'error', error: (err as Error).message, name: updated[i].name || '(failed)' };
      }
      setBatchForm((f) => ({ ...f, rows: [...updated] }));

      // Small delay between requests
      if (i < updated.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    setBatchForm((f) => ({ ...f, fetching: false, fetchIndex: -1 }));
  };

  const updateBatchRow = (id: number, field: keyof BatchRow, value: string) => {
    setBatchForm((f) => ({
      ...f,
      rows: f.rows.map((r) => r.id === id ? { ...r, [field]: value } : r),
    }));
  };

  const removeBatchRow = (id: number) => {
    setBatchForm((f) => ({ ...f, rows: f.rows.filter((r) => r.id !== id) }));
  };

  const handleBatchSubmit = async () => {
    const { accountId, campaignId, rows } = batchForm;
    const validRows = rows.filter((r) => r.name && r.linkedinUrl);
    if (!accountId) { setBatchForm((f) => ({ ...f, error: 'Select an account.' })); return; }
    if (validRows.length === 0) { setBatchForm((f) => ({ ...f, error: 'No rows with a name filled in.' })); return; }

    setBatchForm((f) => ({ ...f, submitting: true, error: '' }));
    try {
      const result = await leadsApi.batch({
        accountId,
        campaignId: campaignId || undefined,
        leads: validRows.map((r) => ({
          linkedinUrl: r.linkedinUrl,
          name:        r.name,
          headline:    r.headline || undefined,
          company:     r.company  || undefined,
          location:    r.location || undefined,
        })),
      });
      setBatchForm((f) => ({ ...f, submitting: false, successMsg: result.message }));
      await loadData();
      setTimeout(() => {
        setModal('none');
        setBatchForm({ accountId: '', campaignId: preselectedCampaign, urlInput: '', rows: [], step: 'input', fetching: false, fetchIndex: -1, autoFetch: true, submitting: false, error: '', successMsg: '' });
      }, 1800);
    } catch (err) {
      setBatchForm((f) => ({ ...f, submitting: false, error: (err as Error).message }));
    }
  };

  // ── Leads table actions ────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, status: string) => {
    try { await leadsApi.update(id, { status }); await loadData(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try { await leadsApi.delete(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const browserAccounts = accounts.filter((a) => a.connectionMode === 'browser');

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">{total} lead{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('batch')}
            disabled={accounts.length === 0}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-40"
          >
            📋 Batch Import
          </button>
          <button
            onClick={() => setModal('single')}
            disabled={accounts.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search name, company, headline..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filter.campaignId}
          onChange={(e) => setFilter({ ...filter, campaignId: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(filter.search || filter.status || filter.campaignId) && (
          <button onClick={() => setFilter({ search: '', status: '', campaignId: '' })} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold mb-2">{filter.search || filter.status ? 'No leads match' : 'No leads yet'}</h3>
          <p className="text-gray-500 text-sm mb-6">Use Batch Import to add multiple LinkedIn profiles at once.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setModal('batch')} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">📋 Batch Import</button>
            <button onClick={() => setModal('single')} className="border border-gray-200 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">+ Single Lead</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Headline', 'Company', 'Location', 'Campaign', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                    <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">LinkedIn ↗</a>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-sm max-w-xs"><span className="line-clamp-2">{lead.headline || '—'}</span></td>
                  <td className="px-5 py-4 text-gray-500 text-sm whitespace-nowrap">{lead.company || '—'}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm whitespace-nowrap">{lead.location || '—'}</td>
                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{lead.campaign?.name || '—'}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={'px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none ' + (STATUS_COLORS[lead.status] ?? 'bg-gray-100')}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button onClick={() => handleDelete(lead.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ SINGLE LEAD MODAL ══════════════ */}
      {modal === 'single' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Add Lead</h2>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {singleForm.error && (
              <div className={`px-4 py-3 rounded-lg mb-4 text-sm border ${
                singleForm.error.includes('Chrome') || singleForm.error.includes('Puppeteer') || singleForm.error.includes('timeout') || singleForm.error.includes('too long')
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : singleForm.error.includes('expired') || singleForm.error.includes('cookies')
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {singleForm.error}
                {(singleForm.error.includes('expired') || singleForm.error.includes('session')) && (
                  <p className="mt-1 font-medium">→ Go to Accounts, edit this account, and paste fresh cookies.</p>
                )}
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account <span className="text-red-500">*</span></label>
                <select
                  value={singleForm.accountId}
                  onChange={(e) => setSingleForm((f) => ({ ...f, accountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.connectionMode === 'browser' ? '🤖' : a.connectionMode === 'oauth' ? '🔐' : '📋'} {a.profileName || a.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                <select
                  value={singleForm.campaignId}
                  onChange={(e) => setSingleForm((f) => ({ ...f, campaignId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* URL + auto-fetch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={singleForm.linkedinUrl}
                    onChange={(e) => setSingleForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://linkedin.com/in/username"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSingleFetch}
                    disabled={!singleForm.linkedinUrl || !singleForm.accountId || singleForm.fetching || browserAccounts.length === 0}
                    title={browserAccounts.length === 0 ? 'Requires a browser-mode account (with password or cookies saved)' : 'Auto-fetch Name, Headline, Company, Location from LinkedIn'}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {singleForm.fetching ? '⏳' : '✨ Fetch'}
                  </button>
                </div>
                {browserAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Auto-fetch needs a browser-mode account</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={singleForm.name} onChange={(e) => setSingleForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-filled after fetch" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                  <input type="text" value={singleForm.headline} onChange={(e) => setSingleForm((f) => ({ ...f, headline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Job title / tagline" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input type="text" value={singleForm.company} onChange={(e) => setSingleForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={singleForm.location} onChange={(e) => setSingleForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Dubai, UAE" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal('none')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ BATCH IMPORT MODAL ══════════════ */}
      {modal === 'batch' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Batch Import Leads</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {batchForm.step === 'input' ? 'Paste LinkedIn profile URLs — one per line' : `${batchForm.rows.length} profiles to import`}
                </p>
              </div>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {batchForm.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{batchForm.error}</div>}
              {batchForm.successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">{batchForm.successMsg}</div>}

              {/* Account + Campaign row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account <span className="text-red-500">*</span></label>
                  <select
                    value={batchForm.accountId}
                    onChange={(e) => setBatchForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.connectionMode === 'browser' ? '🤖' : a.connectionMode === 'oauth' ? '🔐' : '📋'} {a.profileName || a.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Campaign</label>
                  <select
                    value={batchForm.campaignId}
                    onChange={(e) => setBatchForm((f) => ({ ...f, campaignId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* STEP 1: URL input */}
              {batchForm.step === 'input' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn Profile URLs <span className="text-gray-400 font-normal">(one per line, max 200)</span>
                    </label>
                    <textarea
                      value={batchForm.urlInput}
                      onChange={(e) => setBatchForm((f) => ({ ...f, urlInput: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-48 font-mono"
                      placeholder={`https://linkedin.com/in/john-doe\nhttps://linkedin.com/in/jane-smith\nhttps://linkedin.com/in/bob-jones`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {batchForm.urlInput.split('\n').filter((l) => l.trim().includes('linkedin.com/in/')).length} valid URLs detected
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoFetch"
                      checked={batchForm.autoFetch}
                      onChange={(e) => setBatchForm((f) => ({ ...f, autoFetch: e.target.checked }))}
                      className="accent-blue-600"
                    />
                    <label htmlFor="autoFetch" className="text-sm text-gray-700">
                      Auto-fetch Name, Headline, Company, Location from LinkedIn
                      {browserAccounts.length === 0 && <span className="text-amber-600 ml-1">(needs browser-mode account)</span>}
                    </label>
                  </div>
                </>
              )}

              {/* STEP 2: Review / edit rows */}
              {batchForm.step === 'review' && (
                <div className="space-y-3">
                  {/* Fetch all button */}
                  {batchForm.rows.some((r) => !r.name) && (
                    <button
                      onClick={fetchBatchProfiles}
                      disabled={batchForm.fetching || !batchForm.accountId}
                      className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {batchForm.fetching
                        ? <>⏳ Fetching {batchForm.fetchIndex + 1}/{batchForm.rows.length}…</>
                        : <>✨ Auto-fetch All Profiles ({batchForm.rows.filter((r) => !r.name).length} remaining)</>
                      }
                    </button>
                  )}

                  {/* Rows table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                      <div className="col-span-3">URL</div>
                      <div className="col-span-3">Name</div>
                      <div className="col-span-2">Headline</div>
                      <div className="col-span-2">Company</div>
                      <div className="col-span-1">Location</div>
                      <div className="col-span-1 text-center">Del</div>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {batchForm.rows.map((row) => (
                        <div key={row.id} className={`grid grid-cols-12 gap-1 px-3 py-2 items-center text-xs ${row.state === 'fetching' ? 'bg-purple-50' : row.state === 'error' ? 'bg-red-50' : row.state === 'done' ? 'bg-green-50' : ''}`}>
                          <div className="col-span-3 font-mono truncate text-gray-400 text-xs" title={row.linkedinUrl}>
                            {row.state === 'fetching' && <span className="text-purple-600 mr-1">⏳</span>}
                            {row.state === 'done' && <span className="text-green-600 mr-1">✅</span>}
                            {row.state === 'error' && <span className="text-red-500 mr-1" title={row.error}>❌</span>}
                            {row.linkedinUrl.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '')}
                          </div>
                          <input value={row.name} onChange={(e) => updateBatchRow(row.id, 'name', e.target.value)} placeholder="Name *" className="col-span-3 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <input value={row.headline} onChange={(e) => updateBatchRow(row.id, 'headline', e.target.value)} placeholder="Headline" className="col-span-2 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <input value={row.company} onChange={(e) => updateBatchRow(row.id, 'company', e.target.value)} placeholder="Company" className="col-span-2 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <input value={row.location} onChange={(e) => updateBatchRow(row.id, 'location', e.target.value)} placeholder="City" className="col-span-1 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <button onClick={() => removeBatchRow(row.id)} className="col-span-1 text-center text-red-400 hover:text-red-600">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {batchForm.rows.filter((r) => r.name).length}/{batchForm.rows.length} rows ready to import
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => {
                  if (batchForm.step === 'review') {
                    setBatchForm((f) => ({ ...f, step: 'input', rows: [] }));
                  } else {
                    setModal('none');
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {batchForm.step === 'review' ? '← Back' : 'Cancel'}
              </button>

              {batchForm.step === 'input' ? (
                <button
                  onClick={parseBatchUrls}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Next: Review →
                </button>
              ) : (
                <button
                  onClick={handleBatchSubmit}
                  disabled={batchForm.submitting || batchForm.fetching || batchForm.rows.filter((r) => r.name).length === 0}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {batchForm.submitting
                    ? 'Saving...'
                    : `Import ${batchForm.rows.filter((r) => r.name).length} Leads`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
