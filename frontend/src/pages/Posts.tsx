import { useEffect, useState } from 'react';
import { accountsApi, linkedinApi, aiApi, Account, ScheduledPost } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  failed:    'bg-red-100 text-red-700',
};

export default function Posts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts,    setPosts]    = useState<ScheduledPost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [form, setForm] = useState({
    accountId:   '',
    content:     '',
    scheduledAt: '',
    scheduleNow: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [accs, postsData] = await Promise.all([accountsApi.list(), linkedinApi.getPosts()]);
      setAccounts(accs.filter((a) => a.status === 'active'));
      setPosts(postsData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setPosting(true);
    try {
      const res = await linkedinApi.publishPost({
        accountId:   form.accountId,
        content:     form.content,
        scheduledAt: !form.scheduleNow && form.scheduledAt ? form.scheduledAt : undefined,
      });
      setSuccess(
        res.status === 'published'
          ? '✅ Post published successfully on LinkedIn!'
          : `✅ Post scheduled for ${new Date(form.scheduledAt).toLocaleString()}`
      );
      setForm({ ...form, content: '', scheduledAt: '' });
      await loadData();
    } catch (err) { setError((err as Error).message); }
    finally { setPosting(false); }
  };

  const handleAiDraft = async () => {
    if (!form.content.trim()) {
      setError('Enter a topic or prompt first, then click AI Draft to expand it.');
      return;
    }
    setAiLoading(true); setError('');
    try {
      const res = await aiApi.generate({ prompt: form.content, type: 'post' });
      setForm({ ...form, content: res.content });
    } catch (err) { setError((err as Error).message); }
    finally { setAiLoading(false); }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this post record?')) return;
    try { await linkedinApi.deletePost(id); await loadData(); }
    catch (err) { console.error(err); }
  };

  const connectedAccounts = accounts.filter(
    (a) => a.connectionMode !== 'manual' && (a.isConnected || a.connectionMode === 'browser')
  );

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Post Manager</h1>
      <p className="text-gray-500 text-sm mb-6">Publish or schedule LinkedIn posts. Use AI to draft content.</p>

      {connectedAccounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">No connected accounts</p>
            <p>Go to <strong>Accounts</strong> and connect an account via OAuth or Browser mode to publish posts.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Compose Post</h2>

          {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

          <form onSubmit={handlePost} className="space-y-4">
            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account <span className="text-red-500">*</span>
              </label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a connected account</option>
                {connectedAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.connectionMode === 'oauth' ? '🔐' : '🤖'} {a.profileName || a.email}
                  </option>
                ))}
                {connectedAccounts.length === 0 && (
                  <option disabled>No connected accounts — add one in Accounts page</option>
                )}
              </select>
            </div>

            {/* Content */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Post Content <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={aiLoading}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {aiLoading ? '✨ Drafting...' : '✨ AI Draft'}
                </button>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-40"
                placeholder="Write your post here, or type a topic and click ✨ AI Draft..."
                maxLength={3000}
                required
              />
              <div className="text-right text-xs text-gray-400">{form.content.length}/3000</div>
            </div>

            {/* Schedule toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, scheduleNow: true })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.scheduleNow ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                📤 Post Now
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, scheduleNow: false })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!form.scheduleNow ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                🗓️ Schedule
              </button>
            </div>

            {!form.scheduleNow && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!form.scheduleNow}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={posting || connectedAccounts.length === 0}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {posting ? 'Publishing...' : form.scheduleNow ? '📤 Publish Now' : '🗓️ Schedule Post'}
            </button>
          </form>
        </div>

        {/* Post history */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Post History</h2>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <span className="text-4xl mb-2">📝</span>
              <p className="text-sm">No posts yet</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-[500px] overflow-y-auto">
              {posts.map((post) => (
                <li key={post.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_COLORS[post.status] ?? 'bg-gray-100'}`}>
                      {post.status}
                    </span>
                    <button onClick={() => handleDeletePost(post.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-1">{post.content}</p>
                  <div className="text-xs text-gray-400">
                    {post.account?.profileName || post.account?.email}
                    {post.publishedAt && ` · Published ${new Date(post.publishedAt).toLocaleDateString()}`}
                    {post.scheduledAt && post.status === 'scheduled' && ` · Scheduled ${new Date(post.scheduledAt).toLocaleString()}`}
                  </div>
                  {post.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">{post.errorMessage}</p>
                  )}
                  {post.linkedinPostId && (
                    <p className="text-xs text-gray-400 mt-1">LinkedIn ID: {post.linkedinPostId}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
