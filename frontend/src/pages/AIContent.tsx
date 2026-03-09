import { useState } from 'react';
import { aiApi } from '../lib/api';

type ContentType = 'post' | 'comment' | 'message';
type ActiveTab = 'generate' | 'improve' | 'ideas';

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'post', label: 'LinkedIn Post' },
  { value: 'comment', label: 'Comment' },
  { value: 'message', label: 'Direct Message' },
];

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    type: 'post' as ContentType,
  });

  const [improveForm, setImproveForm] = useState({
    content: '',
    instruction: '',
  });

  const [ideasForm, setIdeasForm] = useState({
    topic: '',
    count: 5,
  });

  const resetOutput = () => {
    setResult('');
    setIdeas([]);
    setError('');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetOutput();
    try {
      const response = await aiApi.generate(generateForm);
      setResult(response.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetOutput();
    try {
      const response = await aiApi.improve(improveForm);
      setResult(response.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetOutput();
    try {
      const response = await aiApi.ideas(ideasForm);
      setIdeas(response.ideas);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TAB_STYLES = (active: boolean) =>
    'px-4 py-2 rounded text-sm font-medium transition-colors ' +
    (active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Content Generator</h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button onClick={() => { setActiveTab('generate'); resetOutput(); }} className={TAB_STYLES(activeTab === 'generate')}>
          ✨ Generate
        </button>
        <button onClick={() => { setActiveTab('improve'); resetOutput(); }} className={TAB_STYLES(activeTab === 'improve')}>
          🔧 Improve
        </button>
        <button onClick={() => { setActiveTab('ideas'); resetOutput(); }} className={TAB_STYLES(activeTab === 'ideas')}>
          💡 Ideas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Input Panel ── */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'generate' && (
            <form onSubmit={handleGenerate}>
              <h2 className="text-lg font-semibold mb-4">Generate Content</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Content Type</label>
                <select
                  value={generateForm.type}
                  onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value as ContentType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={generateForm.prompt}
                  onChange={(e) => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-36 resize-none"
                  placeholder="Describe what you want to write about..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </form>
          )}

          {activeTab === 'improve' && (
            <form onSubmit={handleImprove}>
              <h2 className="text-lg font-semibold mb-4">Improve Content</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Your Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={improveForm.content}
                  onChange={(e) => setImproveForm({ ...improveForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-32 resize-none"
                  placeholder="Paste your content here..."
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Instructions <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={improveForm.instruction}
                  onChange={(e) => setImproveForm({ ...improveForm, instruction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-24 resize-none"
                  placeholder="e.g., Make it more professional, add a call to action..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Improving...' : 'Improve'}
              </button>
            </form>
          )}

          {activeTab === 'ideas' && (
            <form onSubmit={handleIdeas}>
              <h2 className="text-lg font-semibold mb-4">Generate Post Ideas</h2>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ideasForm.topic}
                  onChange={(e) => setIdeasForm({ ...ideasForm, topic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="e.g., leadership, AI trends, productivity..."
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Number of Ideas
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={ideasForm.count}
                  onChange={(e) => setIdeasForm({ ...ideasForm, count: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Ideas'}
              </button>
            </form>
          )}
        </div>

        {/* ── Output Panel ── */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Result</h2>
            {result && (
              <button
                onClick={() => copyToClipboard(result)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : result ? (
            <div className="flex-1 bg-gray-50 rounded p-4 whitespace-pre-wrap text-sm overflow-y-auto min-h-48">
              {result}
            </div>
          ) : ideas.length > 0 ? (
            <ul className="flex-1 space-y-2 overflow-y-auto">
              {ideas.map((idea, i) => (
                <li key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">{idea}</span>
                  <button
                    onClick={() => copyToClipboard(idea)}
                    className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm min-h-48">
              Generated content will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
