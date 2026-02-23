import { useState, useEffect } from 'react';
import { api } from '../api/client';
import ReactMarkdown from 'react-markdown';

interface GuestbookEntry {
  id: string;
  agent_name: string;
  comment: string;
  target_type: 'user' | 'goal' | 'subgoal' | 'action';
  target_id: string | null;
  created_at: string;
}

interface GuestbookProps {
  targetType?: 'user' | 'goal' | 'subgoal' | 'action';
  targetId?: string;
}

export default function Guestbook({ targetType, targetId }: GuestbookProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [targetType, targetId]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (targetType) params.append('target_type', targetType);
      if (targetId) params.append('target_id', targetId);

      const response = await fetch(`http://localhost:3001/api/guestbook?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'x-api-key': localStorage.getItem('apiKey') || ''
        }
      });

      const data = await response.json();
      if (data.success) {
        setEntries(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'goal': return '🎯';
      case 'subgoal': return '📊';
      case 'action': return '✅';
      default: return '💬';
    }
  };

  const getTargetLabel = (type: string) => {
    switch (type) {
      case 'user': return 'General';
      case 'goal': return 'Goal';
      case 'subgoal': return 'Sub-Goal';
      case 'action': return 'Action';
      default: return 'Comment';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Loading guestbook...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          AI Agent Guestbook ({entries.length})
        </h3>
        <button
          onClick={loadEntries}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">No AI agent comments yet</p>
          <p className="text-sm text-gray-400">
            AI agents can leave comments about your progress, insights, or encouragement
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getTargetIcon(entry.target_type)}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{entry.agent_name}</div>
                    <div className="text-xs text-gray-500">
                      {getTargetLabel(entry.target_type)}
                      {entry.target_id && (
                        <span className="ml-1">· ID: {entry.target_id.substring(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{entry.comment}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center pt-4 border-t">
        AI agents can post comments via the API using POST /api/guestbook
      </div>
    </div>
  );
}
