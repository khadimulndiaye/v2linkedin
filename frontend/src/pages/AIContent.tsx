import { useState } from 'react';
import { aiApi } from '../lib/api';

type ContentType = 'post' | 'comment' | 'message';
type Tab = 'generate' | 'improve' | 'ideas';

const CONTENT_TYPES: { value: ContentType; label: string; desc: string }[] = [
  { value: 'post',    label: 'LinkedIn Post',   desc: 'Full post with hashtags & CTA' },
  { value: 'comment', label: 'Comment',          desc: 'Thoughtful reply to a post' },
  { value: 'message', label: 'Direct Message',   desc: 'Personalized outreach message' },
];

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState('');
  const [ideas, setIdeas]         = useState<string[]>([]);
  const [error, setError]         = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | 'result' | null>(null);

  const [genForm,  setGenForm]  = useState({ prompt: '', type: 'post' as ContentType });
  const [impForm,  setImpForm]  = useState({ content: '', instruction: '' });
  const [ideaForm, setIdeaForm] = useState({ topic: '', count: 5 });

  const resetOutput = () => { setResult(''); setIdeas([]); setError(''); };

  const copy = async (text: string, idx: number | 'result') => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetOutput();
    try {
      const res = await aiApi.generate(genForm);
      setResult(res.content);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleImprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetOutput();
    try {
      const res = await aiApi.improve(impForm);
      setResult(res.content);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetOutput();
    try {
      const res = await aiApi.ideas(ideaForm);
      setIdeas(res.ideas);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const tabBtn = (t: Tab, label: string, emoji: string) => (
    <button
      onClick={() => { setActiveTab(t); resetOutput(); }}
      className={
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
        (activeTab === t
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')
      }
    >
      {emoji} {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Content Generator</h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate professional LinkedIn content. Requires OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY on the server.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabBtn('generate', 'Generate',   '✨')}
        {tabBtn('improve',  'Improve',    '🔧')}
        {tabBtn('ideas',    'Post Ideas', '💡')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          {activeTab === 'generate' && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <h2 className="font-semibold text-gray-800">Generate Content</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                <div className="space-y-2">
                  {CONTENT_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={
                        'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ' +
                        (genForm.type === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')
                      }
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t.value}
                        checked={genForm.type === t.value}
                        onChange={() => setGenForm({ ...genForm, type: t.value })}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-gray-500">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What should it be about? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={genForm.prompt}
                  onChange={(e) => setGenForm({ ...genForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-28 text-sm"
                  placeholder={
                    genForm.type === 'post'
                      ? 'e.g., My experience scaling a startup from 10 to 100 employees...'
                      : genForm.type === 'comment'
                      ? 'e.g., Post about AI replacing jobs — I want to offer a balanced view...'
                      : 'e.g., Reaching out to a product manager at a fintech startup about collaboration...'
                  }
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {loading ? 'Generating...' : '✨ Generate'}
              </button>
            </form>
          )}

          {activeTab === 'improve' && (
            <form onSubmit={handleImprove} className="space-y-4">
              <h2 className="font-semibold text-gray-800">Improve Existing Content</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={impForm.content}
                  onChange={(e) => setImpForm({ ...impForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32 text-sm"
                  placeholder="Paste your existing LinkedIn post or message here..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How should it be improved? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={impForm.instruction}
                  onChange={(e) => setImpForm({ ...impForm, instruction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 text-sm"
                  placeholder="e.g., Make it more concise, add a stronger CTA, less corporate tone..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {loading ? 'Improving...' : '🔧 Improve'}
              </button>
            </form>
          )}

          {activeTab === 'ideas' && (
            <form onSubmit={handleIdeas} className="space-y-4">
              <h2 className="font-semibold text-gray-800">Generate Post Ideas</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic or Theme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ideaForm.topic}
                  onChange={(e) => setIdeaForm({ ...ideaForm, topic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., startup growth, remote work, AI trends, leadership..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Ideas</label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIdeaForm({ ...ideaForm, count: n })}
                      className={
                        'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ' +
                        (ideaForm.count === n
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {loading ? 'Generating...' : '💡 Generate Ideas'}
              </button>
            </form>
          )}
        </div>

        {/* Output */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-80">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Result</h2>
            {result && (
              <button onClick={() => copy(result, 'result')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                {copiedIdx === 'result' ? '✓ Copied!' : 'Copy all'}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <p className="font-medium">Error</p>
              <p className="mt-0.5">{error}</p>
              {(error.includes('API key') || error.includes('configured')) && (
                <p className="mt-2 text-xs bg-red-100 rounded p-2">
                  Set <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code>, or <code>DEEPSEEK_API_KEY</code> in your Render environment variables.
                </p>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <span className="text-sm">AI is writing...</span>
            </div>
          ) : result ? (
            <div className="flex-1 bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap overflow-y-auto leading-relaxed">
              {result}
            </div>
          ) : ideas.length > 0 ? (
            <ul className="flex-1 space-y-2 overflow-y-auto">
              {ideas.map((idea, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{idea}</span>
                  <button
                    onClick={() => copy(idea, i)}
                    className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                  >
                    {copiedIdx === i ? '✓' : 'Copy'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-300">
              <span className="text-5xl">✨</span>
              <p className="text-sm text-gray-400">Generated content will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
