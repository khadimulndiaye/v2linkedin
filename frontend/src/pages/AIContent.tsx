import { useState } from 'react';
import { aiApi } from '../lib/api';

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<'generate' | 'improve'>('generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    type: 'post',
    provider: 'openai',
  });

  const [improveForm, setImproveForm] = useState({
    content: '',
    instruction: '',
    provider: 'openai',
  });

  const contentTypes = [
    { value: 'post', label: 'LinkedIn Post' },
    { value: 'article', label: 'Article' },
    { value: 'comment', label: 'Comment' },
    { value: 'message', label: 'Direct Message' },
    { value: 'connection', label: 'Connection Request' },
  ];

  const providers = [
    { value: 'openai', label: 'OpenAI GPT' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'deepseek', label: 'DeepSeek' },
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

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
    setError('');
    setResult('');

    try {
      const response = await aiApi.improve(improveForm);
      setResult(response.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Content Generator</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={'px-4 py-2 rounded ' +
            (activeTab === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')
          }
        >
          Generate Content
        </button>
        <button
          onClick={() => setActiveTab('improve')}
          className={'px-4 py-2 rounded ' +
            (activeTab === 'improve' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')
          }
        >
          Improve Content
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'generate' ? (
            <form onSubmit={handleGenerate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Content Type</label>
                <select
                  value={generateForm.type}
                  onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {contentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">AI Provider</label>
                <select
                  value={generateForm.provider}
                  onChange={(e) => setGenerateForm({ ...generateForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Prompt</label>
                <textarea
                  value={generateForm.prompt}
                  onChange={(e) => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-32"
                  placeholder="Describe what you want to write about..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Content'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleImprove}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">AI Provider</label>
                <select
                  value={improveForm.provider}
                  onChange={(e) => setImproveForm({ ...improveForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Your Content</label>
                <textarea
                  value={improveForm.content}
                  onChange={(e) => setImproveForm({ ...improveForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-32"
                  placeholder="Paste your content here..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Improvement Instructions</label>
                <textarea
                  value={improveForm.instruction}
                  onChange={(e) => setImproveForm({ ...improveForm, instruction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-20"
                  placeholder="e.g., Make it more professional, add a call to action..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Improving...' : 'Improve Content'}
              </button>
            </form>
          )}
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Result</h2>
            {result && (
              <button
                onClick={copyToClipboard}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Copy to Clipboard
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : result ? (
            <div className="bg-gray-50 rounded p-4 whitespace-pre-wrap h-64 overflow-y-auto">
              {result}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Generated content will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
