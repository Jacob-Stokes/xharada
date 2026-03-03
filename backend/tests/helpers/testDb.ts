import Database from 'better-sqlite3';

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS primary_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sub_goals (
      id TEXT PRIMARY KEY,
      primary_goal_id TEXT NOT NULL,
      position INTEGER NOT NULL CHECK(position >= -99 AND position <= 8),
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
      position INTEGER NOT NULL CHECK(position >= -99 AND position <= 8),
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

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action_item_id TEXT NOT NULL,
      log_type TEXT NOT NULL CHECK(log_type IN ('note', 'progress', 'completion', 'media', 'link')),
      content TEXT,
      log_date TEXT NOT NULL,
      duration_minutes INTEGER,
      metric_value REAL,
      metric_unit TEXT,
      media_url TEXT,
      media_type TEXT CHECK(media_type IN ('image', 'video', 'document', 'audio')),
      external_link TEXT,
      mood TEXT CHECK(mood IN ('motivated', 'challenged', 'accomplished', 'frustrated', 'neutral')),
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guestbook (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      comment TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('user', 'goal', 'subgoal', 'action')),
      target_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shared_goals (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      show_logs INTEGER DEFAULT 0 CHECK(show_logs IN (0, 1)),
      show_guestbook INTEGER DEFAULT 0 CHECK(show_guestbook IN (0, 1)),
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES primary_goals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_etiquette (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_shared_goals_token ON shared_goals(token);
    CREATE INDEX IF NOT EXISTS idx_shared_goals_goal ON shared_goals(goal_id);
    CREATE INDEX IF NOT EXISTS idx_agent_etiquette_user ON agent_etiquette(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_goals_primary_goal ON sub_goals(primary_goal_id);
    CREATE INDEX IF NOT EXISTS idx_action_items_sub_goal ON action_items(sub_goal_id);
    CREATE INDEX IF NOT EXISTS idx_action_items_completed ON action_items(completed);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_item_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(log_type);
    CREATE INDEX IF NOT EXISTS idx_guestbook_user ON guestbook(user_id);
    CREATE INDEX IF NOT EXISTS idx_guestbook_target ON guestbook(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_primary_goals_user ON primary_goals(user_id);
  `;

  db.exec(SCHEMA);

  return db;
}
