import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CampaignInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  account: { email: string; profileName?: string | null; connectionMode: string };
  _count?: { leads: number };
}

interface LeadInfo {
  id: string; name: string; linkedinUrl: string; status: string;
  headline?: string | null; company?: string | null;
}

interface LogEntry {
  id:      number;
  type:    'log' | 'progress' | 'start' | 'done' | 'error';
  message: string;
  current?: number;
  total?:   number;
}

const TYPE_DEFAULTS: Record<string, { verb: string; note: string; needsMessage: boolean }> = {
  connection: { verb: 'Send Connection Request', note: 'Optional note (max 300 chars) sent with the invite', needsMessage: false },
  message:    { verb: 'Send Message',            note: 'Message text to send (required)',                   needsMessage: true  },
  content:    { verb: 'Publish Post',            note: 'Post content to publish (required)',                needsMessage: true  },
  mixed:      { verb: 'Run Actions',             note: 'Optional message / post content',                  needsMessage: false },
};

export default function CampaignRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [leads,    setLeads]    = useState<LeadInfo[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading,  setLoading]  = useState(true);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [log,      setLog]      = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary,  setSummary]  = useState<{ sent: number; failed: number; skipped: number } | null>(null);

  const [opts, setOpts] = useState({
    message:     '',
    dailyLimit:  20,
    delayMinSec: 15,
    delayMaxSec: 45,
  });

  const logRef  = useRef<HTMLDivElement>(null);
  const entryId = useRef(0);

  useEffect(() => { loadPreview(); }, [id]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const loadPreview = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/campaigns/${id}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaign(data.campaign);
      setLeads(data.leads);
      setByStatus(data.byStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    setLog((prev) => [...prev, { ...entry, id: ++entryId.current }]);
  };

  const handleRun = async () => {
    const typeInfo = TYPE_DEFAULTS[campaign?.type ?? 'connection'];
    if (typeInfo.needsMessage && !opts.message.trim()) {
      alert(`Please enter the ${campaign?.type === 'message' ? 'message' : 'post content'} before running.`);
      return;
    }
    if (!confirm(`Run campaign "${campaign?.name}" against ${byStatus['new'] ?? 0} new leads?\n\nThis will use browser automation to send real LinkedIn actions.`)) return;

    setRunning(true);
    setDone(false);
    setLog([]);
    setProgress({ current: 0, total: 0 });
    setSummary(null);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}/run`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
          Accept:          'text/event-stream',
        },
        body: JSON.stringify(opts),
      });

      if (!res.body) throw new Error('No response stream');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setProgress({ current: event.current, total: event.total });
              addLog({ type: 'progress', message: `Processing ${event.lead?.name ?? event.current}…`, current: event.current, total: event.total });
            } else if (event.type === 'done') {
              setSummary({ sent: event.sent, failed: event.failed, skipped: event.skipped });
              addLog({ type: 'done', message: event.message });
              setDone(true);
              await loadPreview(); // refresh lead counts
            } else if (event.type === 'error') {
              addLog({ type: 'error', message: event.message });
              setDone(true);
            } else {
              addLog({ type: event.type ?? 'log', message: event.message });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      addLog({ type: 'error', message: err.message });
      setDone(true);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-medium">Campaign not found.</p>
        <button onClick={() => navigate('/campaigns')} className="mt-4 text-blue-600 hover:underline text-sm">← Back to Campaigns</button>
      </div>
    );
  }

  const typeInfo   = TYPE_DEFAULTS[campaign.type] ?? TYPE_DEFAULTS['connection'];
  const newLeads   = byStatus['new'] ?? 0;
  const isBrowser  = campaign.account.connectionMode === 'browser';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/campaigns')} className="text-gray-400 hover:text-gray-600 text-sm">← Campaigns</button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
          campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>{campaign.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Account + mode */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Account</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{isBrowser ? '🤖' : '🔐'}</span>
              <div>
                <p className="font-medium text-gray-800">{campaign.account.profileName || campaign.account.email}</p>
                <p className="text-xs text-gray-400">{campaign.account.connectionMode} mode</p>
              </div>
            </div>
            {!isBrowser && campaign.type !== 'content' && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                ⚠️ Connection requests and messages require <strong>browser mode</strong>. Switch this account to browser mode first.
              </div>
            )}
          </div>

          {/* Lead stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Lead Status</h2>
            <div className="space-y-2">
              {[
                { key: 'new',       label: 'Pending (will run)',  color: 'bg-blue-500' },
                { key: 'contacted', label: 'Connection sent',     color: 'bg-green-500' },
                { key: 'messaged',  label: 'Messaged',            color: 'bg-purple-500' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-gray-600">{label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{byStatus[key] ?? 0}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                <span>Total leads</span><span>{leads.length}</span>
              </div>
            </div>
            {leads.length === 0 && (
              <button
                onClick={() => navigate(`/leads?campaignId=${campaign.id}`)}
                className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
              >
                + Add Leads to This Campaign
              </button>
            )}
          </div>

          {/* Run options */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Run Settings</h2>
            <div className="space-y-3">

              {/* Message / note */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {typeInfo.verb} Content
                  {typeInfo.needsMessage && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={opts.message}
                  onChange={(e) => setOpts({ ...opts, message: e.target.value })}
                  disabled={running}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 disabled:opacity-50"
                  placeholder={typeInfo.note}
                  maxLength={campaign.type === 'connection' ? 300 : 3000}
                />
                <p className="text-right text-xs text-gray-400">{opts.message.length} chars</p>
              </div>

              {/* Daily limit */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Daily Limit: <span className="text-blue-600 font-bold">{opts.dailyLimit}</span> leads
                </label>
                <input
                  type="range" min={1} max={50} value={opts.dailyLimit}
                  onChange={(e) => setOpts({ ...opts, dailyLimit: +e.target.value })}
                  disabled={running}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>1 (safe)</span><span>25 (moderate)</span><span>50 (risky)</span>
                </div>
              </div>

              {/* Delay */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Delay between actions: <span className="text-blue-600 font-bold">{opts.delayMinSec}–{opts.delayMaxSec}s</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" min={5} max={opts.delayMaxSec} value={opts.delayMinSec}
                    onChange={(e) => setOpts({ ...opts, delayMinSec: +e.target.value })}
                    disabled={running}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Min sec"
                  />
                  <input
                    type="number" min={opts.delayMinSec} max={300} value={opts.delayMaxSec}
                    onChange={(e) => setOpts({ ...opts, delayMaxSec: +e.target.value })}
                    disabled={running}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Max sec"
                  />
                </div>
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={running || newLeads === 0 || (!isBrowser && campaign.type !== 'content')}
              className={`mt-4 w-full py-3 rounded-lg text-sm font-bold transition-colors ${
                running
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : newLeads === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }`}
            >
              {running
                ? `⏳ Running… ${progress.current}/${progress.total}`
                : newLeads === 0
                ? '✅ No pending leads'
                : `▶ Run Campaign (${Math.min(newLeads, opts.dailyLimit)} leads)`}
            </button>

            {newLeads === 0 && leads.length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">All leads have been processed.</p>
            )}
          </div>
        </div>

        {/* Live log */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900 rounded-xl shadow-sm overflow-hidden h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="text-gray-300 text-sm font-mono font-semibold">Execution Log</span>
              {running && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-xs font-mono">LIVE</span>
                </div>
              )}
              {done && !running && summary && (
                <span className={`text-xs font-mono font-semibold ${summary.failed > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  DONE — {summary.sent} sent · {summary.failed} failed · {summary.skipped} skipped
                </span>
              )}
            </div>

            <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
              {log.length === 0 ? (
                <p className="text-gray-600 italic">Configure settings and click ▶ Run Campaign to start…</p>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} className={
                    entry.type === 'error'    ? 'text-red-400' :
                    entry.type === 'done'     ? 'text-green-400 font-bold' :
                    entry.type === 'start'    ? 'text-blue-400 font-bold' :
                    entry.type === 'progress' ? 'text-gray-500' :
                    entry.message.startsWith('✅') ? 'text-green-300' :
                    entry.message.startsWith('❌') ? 'text-red-400' :
                    entry.message.startsWith('⏱')  ? 'text-gray-600' :
                    entry.message.startsWith('⚠️') ? 'text-yellow-400' :
                    'text-gray-300'
                  }>
                    {entry.type === 'progress'
                      ? <span className="text-gray-500">→ {entry.message}</span>
                      : <span>{entry.message}</span>
                    }
                  </div>
                ))
              )}
              {running && (
                <div className="flex gap-1 text-gray-500 pt-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {running && progress.total > 0 && (
              <div className="px-4 pb-3">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1 text-right font-mono">{progress.current}/{progress.total}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
