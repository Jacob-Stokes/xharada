import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Guestbook from '../components/Guestbook';

interface ApiKey {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpireDays, setNewKeyExpireDays] = useState('365');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'docs' | 'guestbook'>('keys');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/auth/api-keys', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName,
          expiresInDays: parseInt(newKeyExpireDays),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedKey(data.data.key);
        setNewKeyName('');
        setNewKeyExpireDays('365');
        loadKeys();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Delete API key "${name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/auth/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        loadKeys();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <Link to="/" className="text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Goals
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage API keys and access documentation for AI agents
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'keys'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'docs'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            API Documentation
          </button>
          <button
            onClick={() => setActiveTab('guestbook')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'guestbook'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Guestbook
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'keys' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your API Keys</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Create New Key
                </button>
              </div>

              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : keys.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No API keys yet. Create one to allow AI agents to access your goals.
                </p>
              ) : (
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{key.name}</h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Created:</span>{' '}
                              {formatDate(key.created_at)}
                            </p>
                            <p>
                              <span className="font-medium">Last used:</span>{' '}
                              {formatDate(key.last_used_at)}
                            </p>
                            {key.expires_at && (
                              <p>
                                <span className="font-medium">Expires:</span>{' '}
                                {formatDate(key.expires_at)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteKey(key.id, key.name)}
                          className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Start</h3>
              <p className="text-sm text-blue-800 mb-3">
                Include your API key in the request header to access your goals:
              </p>
              <pre className="bg-blue-900 text-blue-100 p-3 rounded text-xs overflow-x-auto">
                curl -H "x-api-key: YOUR-API-KEY" \{'\n'}
                {'  '}https://harada.jacobstokes.com/api/user/summary
              </pre>
            </div>
          </>
        )}

        {activeTab === 'docs' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">API Documentation</h2>

            <div className="space-y-6">
              {/* Overview */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Overview</h3>
                <p className="text-gray-700">
                  The Harada Method API allows AI agents and external tools to access and manage your goal tracking data. All endpoints require authentication via session cookie or API key.
                </p>
              </section>

              {/* Authentication */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <p className="text-gray-700 mb-2">Two methods:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li><strong>Session Cookie:</strong> Automatically set after web login</li>
                  <li><strong>API Key:</strong> Include in <code className="bg-gray-100 px-1 rounded">x-api-key</code> header</li>
                </ul>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs mt-3 overflow-x-auto">
                  curl -H "x-api-key: YOUR-KEY" https://harada.jacobstokes.com/api/user/summary
                </pre>
              </section>

              {/* Key Endpoints */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Key Endpoints</h3>

                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">GET</span>
                      <code className="text-sm font-mono">/api/user/summary</code>
                    </div>
                    <p className="text-sm text-gray-600">Get complete overview of all goals, sub-goals, and recent activity</p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">GET</span>
                      <code className="text-sm font-mono">/api/goals</code>
                    </div>
                    <p className="text-sm text-gray-600">List all primary goals</p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">GET</span>
                      <code className="text-sm font-mono">/api/goals/:id</code>
                    </div>
                    <p className="text-sm text-gray-600">Get specific goal with all sub-goals and actions</p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">POST</span>
                      <code className="text-sm font-mono">/api/goals</code>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Create new primary goal</p>
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
{`{ "title": "Become World-Class Developer", "description": "..." }`}
                    </pre>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">GET</span>
                      <code className="text-sm font-mono">/api/logs/action/:actionId</code>
                    </div>
                    <p className="text-sm text-gray-600">Get activity logs for an action</p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">POST</span>
                      <code className="text-sm font-mono">/api/logs/action/:actionId</code>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Log activity for an action</p>
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
{`{
  "log_type": "progress",
  "content": "Completed algorithm course module 3",
  "log_date": "2026-02-23",
  "metric_value": 2.5,
  "metric_unit": "hours",
  "mood": "accomplished"
}`}
                    </pre>
                  </div>
                </div>
              </section>

              {/* Data Model */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Data Model</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <p><strong>Primary Goal</strong> → 8 <strong>Sub-Goals</strong> → 8 <strong>Action Items</strong> each (64 total)</p>
                  <p><strong>Activity Logs</strong> track progress against each action item</p>
                  <p className="text-xs text-gray-600 mt-2">
                    Log types: note, progress, completion, media, link<br/>
                    Moods: motivated, challenged, accomplished, frustrated, neutral
                  </p>
                </div>
              </section>

              {/* Response Format */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Response Format</h3>
                <p className="text-gray-700 mb-2">All responses follow this format:</p>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": { ... },
  "error": null
}`}
                </pre>
              </section>

              {/* Example Usage */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Example: AI Agent Usage</h3>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`# Get summary of all goals
curl -H "x-api-key: YOUR-KEY" \\
  https://harada.jacobstokes.com/api/user/summary

# Log progress on an action
curl -X POST \\
  -H "x-api-key: YOUR-KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"log_type":"progress","content":"Made progress today","log_date":"2026-02-23"}' \\
  https://harada.jacobstokes.com/api/logs/action/ACTION_ID`}
                </pre>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'guestbook' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Guestbook targetType="user" />
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create API Key</h2>
            </div>

            <form onSubmit={handleCreateKey} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Claude AI, Mobile App"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires in (days)
                </label>
                <input
                  type="number"
                  value={newKeyExpireDays}
                  onChange={(e) => setNewKeyExpireDays(e.target.value)}
                  min="1"
                  max="3650"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave at 365 for 1 year, or set to 3650 for 10 years
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewKeyName('');
                    setNewKeyExpireDays('365');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Key Modal */}
      {generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">API Key Created</h2>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-semibold">
                  ⚠️ Copy this key now - it will not be shown again!
                </p>
              </div>

              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm break-all">
                {generatedKey}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  alert('API key copied to clipboard!');
                }}
                className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Copy to Clipboard
              </button>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => {
                  setGeneratedKey(null);
                  setShowCreateModal(false);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
