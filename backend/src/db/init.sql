-- Harada Method Database Schema

CREATE TABLE IF NOT EXISTS primary_goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sub_goals (
  id TEXT PRIMARY KEY,
  primary_goal_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position >= 1 AND position <= 8),
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (primary_goal_id) REFERENCES primary_goals(id) ON DELETE CASCADE,
  UNIQUE(primary_goal_id, position)
);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  sub_goal_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position >= 1 AND position <= 8),
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
  completed_at TEXT,
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sub_goal_id) REFERENCES sub_goals(id) ON DELETE CASCADE,
  UNIQUE(sub_goal_id, position)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sub_goals_primary_goal ON sub_goals(primary_goal_id);
CREATE INDEX IF NOT EXISTS idx_action_items_sub_goal ON action_items(sub_goal_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON action_items(completed);
