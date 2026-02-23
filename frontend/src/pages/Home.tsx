import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api, API_URL } from '../api/client';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      await api.createGoal({ title: newGoalTitle });
      setNewGoalTitle('');
      loadGoals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;

    try {
      await api.deleteGoal(id);
      loadGoals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Harada Method</h1>
            <p className="text-gray-600 mt-2">Your Goal Planning System</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/settings"
              state={{ from: location.pathname }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Create New Goal</h2>
          <form onSubmit={handleCreateGoal} className="flex gap-4">
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Enter goal title..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Goal
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Goals</h2>

          {loading ? (
            <p className="text-gray-500">Loading goals...</p>
          ) : goals.length === 0 ? (
            <p className="text-gray-500">No goals yet. Create your first goal above!</p>
          ) : (
            <div className="grid gap-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-gray-600 mt-1">{goal.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span className="capitalize">Status: {goal.status}</span>
                        <span>Created: {new Date(goal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/goal/${goal.id}`}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      >
                        View Grid
                      </Link>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
