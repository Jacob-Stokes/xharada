import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Guestbook from '../components/Guestbook';
import { API_URL } from '../api/client';
import { useDisplaySettings, paletteOptions, PaletteName } from '../context/DisplaySettingsContext';
import { lightenColor } from '../utils/color';

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
  const [activeTab, setActiveTab] = useState<'keys' | 'docs' | 'guestbook' | 'display'>('keys');
  const {
    settings: displaySettings,
    updateSettings: updateDisplaySettings,
    setSubGoalColor,
    resetSubGoalColors,
    computedColors
  } = useDisplaySettings();
  const previewBaseColor = computedColors[1] || '#22c55e';
  const previewActionColor = lightenColor(previewBaseColor, displaySettings.actionShadePercent);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { from?: string } | null) ?? null;
  const candidateBackTarget = locationState?.from;
  const backTarget = candidateBackTarget && candidateBackTarget.startsWith('/')
    ? candidateBackTarget
    : '/';
  const cameFromGoal = backTarget.startsWith('/goal/');
  const backLabel = cameFromGoal ? '← Back to Goal' : '← Back to Goals';

  const handleBackClick = () => {
    navigate(backTarget);
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/api-keys`, {
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
      const response = await fetch(`${API_URL}/api/auth/api-keys`, {
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
      const response = await fetch(`${API_URL}/api/auth/api-keys/${id}`, {
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
          <button
            type="button"
            onClick={handleBackClick}
            className="text-blue-600 hover:underline mb-2 inline-block"
          >
            {backLabel}
          </button>
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
          <button
            onClick={() => setActiveTab('display')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'display'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Display Settings
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
                  The Harada Method API exposes every goal, sub-goal, action item, log, and guestbook entry so AI agents can coach, summarize, or automate check-ins. The API is RESTful, JSON-only, and every endpoint returns a predictable <code className="bg-gray-100 px-1 rounded text-sm">success/data/error</code> envelope.
                </p>
              </section>

              {/* Base URL */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Base URL & Headers</h3>
                <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                  <p><strong>Production:</strong> <code className="bg-white px-2 py-1 rounded border">https://harada.jacobstokes.com</code></p>
                  <p><strong>Local dev:</strong> <code className="bg-white px-2 py-1 rounded border">http://localhost:3001</code></p>
                  <p>All requests must send <code className="bg-white px-2 py-1 rounded border">Content-Type: application/json</code> when a body is present.</p>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
curl -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  "$API_URL/api/user/summary"
                  </pre>
                </div>
              </section>

              {/* Authentication */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    <strong>Session Cookie:</strong> The web app sets <code className="bg-gray-100 px-1 rounded">connect.sid</code>. Use it for browser-based integrations.
                  </li>
                  <li>
                    <strong>API Key:</strong> Create keys in the Settings → API Keys tab. Send <code className="bg-gray-100 px-1 rounded">x-api-key: YOUR_KEY</code> on every request. Keys inherit the same permissions as your user.
                  </li>
                </ul>
              </section>

              {/* Core Resources */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Core Resources</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { method: 'GET', path: '/api/user/summary', text: 'Full tree of goals → sub-goals → actions plus optional logs and guestbook data.' },
                    { method: 'GET', path: '/api/goals', text: 'List every primary goal. Use `/api/goals/:id` for a single goal and `/api/goals/:id/tree` for nested data.' },
                    { method: 'GET', path: '/api/subgoals/:id', text: 'Retrieve or update the 8 supporting goals that belong to a primary goal.' },
                    { method: 'POST', path: '/api/goals | /api/subgoals | /api/actions', text: 'Create goals, sub-goals, or actions. Bodies accept `title`, optional `description`, and ordering fields.' },
                    { method: 'GET', path: '/api/logs/action/:actionId', text: 'Fetch recent activity logs and derived stats for a single action item.' },
                    { method: 'POST', path: '/api/logs/action/:actionId', text: 'Create a new log entry with `log_type`, `content`, `log_date`, optional `metric_value/unit`, and `mood`.' },
                    { method: 'GET', path: '/api/guestbook', text: 'List AI messages. Filter with `target_type=user|goal|subgoal|action` and `target_id`.' },
                    { method: 'POST', path: '/api/guestbook', text: 'Let agents leave encouragement or insights. Provide `agent_name`, `comment`, `target_type`, and optional `target_id`.' },
                  ].map((item) => (
                    <div key={item.path + item.method} className="border border-gray-200 rounded-lg p-4 h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${item.method === 'GET' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {item.method}
                        </span>
                        <code className="text-sm font-mono">{item.path}</code>
                      </div>
                      <p className="text-sm text-gray-600">{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* User Summary Options */}
              <section>
                <h3 className="text-lg font-semibold mb-2">/api/user/summary Parameters</h3>
                <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                  <p><code className="bg-white px-2 py-1 rounded border">level</code> (default <code>standard</code>)</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li><strong>minimal:</strong> goal IDs/titles only</li>
                    <li><strong>standard:</strong> full tree plus activity counts</li>
                    <li><strong>detailed:</strong> adds descriptions, timestamps, metadata</li>
                    <li><strong>full:</strong> includes everything above and supports log hydration</li>
                  </ul>
                  <p className="pt-2"><code className="bg-white px-2 py-1 rounded border">include_logs=true</code> → attach up to 10 recent logs per action (only honored when <code>level=full</code>).</p>
                  <p><code className="bg-white px-2 py-1 rounded border">include_guestbook=true</code> → embed user, goal, and sub-goal guestbook comments inline.</p>
                </div>
              </section>

              {/* Guestbook + Logs */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Activity Logs & Guestbook Payloads</h3>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`# Log progress on an action (captures metrics & mood)
curl -X POST "$API_URL/api/logs/action/{ACTION_ID}" \\
  -H "x-api-key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "log_type": "progress",
        "content": "Completed algorithm course module 3",
        "log_date": "2026-02-23",
        "metric_value": 2.5,
        "metric_unit": "hours",
        "mood": "accomplished"
      }'

# Leave an encouragement note
curl -X POST "$API_URL/api/guestbook" \\
  -H "x-api-key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "agent_name": "Daily Coach",
        "comment": "Momentum looks great—keep logging nightly!",
        "target_type": "user"
      }'`}
                </pre>
              </section>

              {/* Data Model */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Data Model Mental Model</h3>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <p><strong>Primary Goal</strong> → 8 <strong>Sub-Goals</strong> → 8 <strong>Action Items</strong> (64 actions per goal).</p>
                  <p><strong>Activity Logs</strong> capture continuous progress—no "done" checkbox exists.</p>
                  <p className="text-xs text-gray-600">
                    Log types: note, progress, completion, media, link · Moods: motivated, challenged, accomplished, frustrated, neutral.
                  </p>
                </div>
              </section>

              {/* Response Format */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Response & Error Format</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": { ...nested payload... },
  "error": null
}`}
                  </pre>
                  <pre className="bg-gray-900 text-red-300 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": false,
  "data": null,
  "error": "API key is invalid"
}`}
                  </pre>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  HTTP status codes follow standards (200 success, 400 validation errors, 401 auth failures, 500 server issues). Retry cautiously on 500s only.
                </p>
              </section>

              {/* Example Workflows */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Suggested Agent Workflow</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Call <code className="bg-gray-100 px-1 rounded">GET /api/user/summary?level=detailed</code> once per run to build context.</li>
                  <li>Deep dive on neglected actions via <code className="bg-gray-100 px-1 rounded">GET /api/logs/action/:actionId</code>.</li>
                  <li>Post insights or reminders through <code className="bg-gray-100 px-1 rounded">POST /api/guestbook</code>.</li>
                  <li>Record new work by logging activity with metrics for each finished session.</li>
                </ol>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Display Preferences</h2>
              <p className="text-gray-600 text-sm">
                These preferences live in your browser (localStorage). Update them anytime to change how grids render.
              </p>
            </div>

            {/* Default View */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Default Goal View</h3>
              <p className="text-sm text-gray-600 mb-3">
                Choose which layout loads first when you open a goal.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {(['compact', 'full'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateDisplaySettings({ defaultView: mode })}
                    className={`flex-1 border rounded-lg px-4 py-3 text-left transition-colors ${
                      displaySettings.defaultView === mode
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium capitalize">{mode} view</div>
                    <p className="text-sm text-gray-600">
                      {mode === 'compact'
                        ? 'Grid summary tiles with action list.'
                        : 'Full 9×9 Harada board with inline editing.'}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Palette */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Color Palette</h3>
                <button
                  onClick={resetSubGoalColors}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Reset Custom Colors
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Pick a palette or override individual sub-goal colors below.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(paletteOptions).map(([name, option]) => {
                  const paletteName = name as PaletteName;
                  return (
                    <button
                      key={name}
                      onClick={() => updateDisplaySettings({ palette: paletteName })}
                      className={`border rounded-lg p-4 text-left transition-colors ${
                        displaySettings.palette === paletteName
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="font-semibold mb-2">{option.label}</div>
                      <div className="flex gap-1">
                        {option.colors.map((color, idx) => (
                          <span
                            key={`${name}-${idx}`}
                            className="h-6 w-full rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Custom Colors */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Custom Sub-goal Colors</h3>
              <p className="text-sm text-gray-600 mb-4">
                Override any individual block. Leave a color unset to inherit from the palette.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }, (_, index) => {
                  const position = index + 1;
                  const currentColor =
                    displaySettings.customSubGoalColors[position] ||
                    computedColors[position] ||
                    '#22c55e';
                  return (
                    <div
                      key={position}
                      className="border rounded-lg p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Sub-goal {position}</span>
                        {displaySettings.customSubGoalColors[position] && (
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => setSubGoalColor(position, null)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setSubGoalColor(position, e.target.value)}
                        className="w-full h-10 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Action Styling */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Action Tile Styling</h3>
              <div className="flex items-center gap-3">
                <input
                  id="inherit-action-color"
                  type="checkbox"
                  checked={displaySettings.inheritActionColors}
                  onChange={(e) =>
                    updateDisplaySettings({ inheritActionColors: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="inherit-action-color" className="text-sm text-gray-700">
                  Actions inherit their parent sub-goal color
                </label>
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-600 flex justify-between">
                  <span>Action lightness (0% = same as parent, 100% = white)</span>
                  <span>{displaySettings.actionShadePercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={displaySettings.actionShadePercent}
                  onChange={(e) =>
                    updateDisplaySettings({ actionShadePercent: Number(e.target.value) })
                  }
                  disabled={!displaySettings.inheritActionColors}
                  className="w-full mt-2"
                />
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 rounded border" style={{ backgroundColor: previewBaseColor }} />
                    Parent
                  </div>
                  <span>→</span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 rounded border" style={{ backgroundColor: previewActionColor }} />
                    Action preview
                  </div>
                </div>
              </div>
            </section>

            {/* Center Layout */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Center Layout</h3>
              <p className="text-sm text-gray-600 mb-3">
                Decide how the main goal appears inside the 3×3 center.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'single',
                    title: 'Single Focus Block',
                    description: 'One large tile (current default).',
                  },
                  {
                    key: 'radial',
                    title: 'Directional Bridges',
                    description: 'Center goal plus three inner bridge boxes referencing sub-goals with arrows.',
                  },
                ].map((layoutOption) => (
                  <button
                    key={layoutOption.key}
                    onClick={() =>
                      updateDisplaySettings({ centerLayout: layoutOption.key as 'single' | 'radial' })
                    }
                    className={`border rounded-lg p-4 text-left transition-colors ${
                      displaySettings.centerLayout === layoutOption.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="font-semibold">{layoutOption.title}</div>
                    <p className="text-sm text-gray-600">{layoutOption.description}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Center Background */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Center Background</h3>
              <p className="text-sm text-gray-600 mb-3">
                Choose whether the middle 3×3 zone blends with the white card or matches the page&apos;s gray backdrop.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { key: 'card', title: 'Match Card', description: 'White background (current default).' },
                  { key: 'page', title: 'Match Page', description: 'Light gray like the outer page.' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() =>
                      updateDisplaySettings({ centerBackdrop: option.key as 'card' | 'page' })
                    }
                    className={`flex-1 border rounded-lg px-4 py-3 text-left transition-colors ${
                      displaySettings.centerBackdrop === option.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="font-medium">{option.title}</div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                ))}
              </div>
            </section>
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
