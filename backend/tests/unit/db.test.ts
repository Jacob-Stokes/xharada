import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser, createTestGoal, createTestSubGoal, createTestAction } from '../helpers/fixtures';
import type Database from 'better-sqlite3';

describe('Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('Foreign Key Constraints', () => {
    it('cascades delete from user to goals', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email, user.created_at, user.updated_at);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, description, target_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.description, goal.target_date, goal.status, goal.created_at, goal.updated_at);

      // Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

      // Goal should be deleted
      const goals = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goal.id);
      expect(goals).toBeUndefined();
    });

    it('cascades delete from goal to sub-goals to actions', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email, user.created_at, user.updated_at);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, description, target_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.description, goal.target_date, goal.status, goal.created_at, goal.updated_at);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.description, subGoal.created_at, subGoal.updated_at);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, description, completed, completed_at, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.description, action.completed, action.completed_at, action.due_date, action.created_at, action.updated_at);

      // Delete goal
      db.prepare('DELETE FROM primary_goals WHERE id = ?').run(goal.id);

      // Sub-goal and action should be deleted
      const subGoals = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(subGoal.id);
      const actions = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id);
      expect(subGoals).toBeUndefined();
      expect(actions).toBeUndefined();
    });
  });

  describe('Position Constraints', () => {
    it('rejects sub-goal position less than -99', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      const subGoal = createTestSubGoal(goal.id, -100);
      expect(() => {
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
          .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title);
      }).toThrow();
    });

    it('rejects sub-goal position greater than 8', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      const subGoal = createTestSubGoal(goal.id, 9);
      expect(() => {
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
          .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title);
      }).toThrow();
    });

    it('allows positions 1-8 for sub-goals', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      for (let i = 1; i <= 8; i++) {
        const subGoal = createTestSubGoal(goal.id, i);
        expect(() => {
          db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
            .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title);
        }).not.toThrow();
      }

      const subGoals = db.prepare('SELECT COUNT(*) as count FROM sub_goals WHERE primary_goal_id = ?').get(goal.id) as { count: number };
      expect(subGoals.count).toBe(8);
    });

    it('enforces unique position constraint per goal', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      const subGoal1 = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
        .run(subGoal1.id, subGoal1.primary_goal_id, subGoal1.position, subGoal1.title);

      // Try to insert another sub-goal at position 1
      const subGoal2 = createTestSubGoal(goal.id, 1);
      expect(() => {
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
          .run(subGoal2.id, subGoal2.primary_goal_id, subGoal2.position, subGoal2.title);
      }).toThrow();
    });

    it('allows same position across different goals', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal1 = createTestGoal(user.id);
      const goal2 = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)').run(goal1.id, goal1.user_id, goal1.title);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)').run(goal2.id, goal2.user_id, goal2.title);

      const subGoal1 = createTestSubGoal(goal1.id, 1);
      const subGoal2 = createTestSubGoal(goal2.id, 1);

      expect(() => {
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
          .run(subGoal1.id, subGoal1.primary_goal_id, subGoal1.position, subGoal1.title);
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
          .run(subGoal2.id, subGoal2.primary_goal_id, subGoal2.position, subGoal2.title);
      }).not.toThrow();
    });
  });

  describe('Enum Constraints', () => {
    it('validates activity log types', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title) VALUES (?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title);

      // Valid log types
      const validTypes = ['note', 'progress', 'completion', 'media', 'link'];
      validTypes.forEach(logType => {
        expect(() => {
          db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date) VALUES (?, ?, ?, ?)').run(
            createTestUser().id, // Using uuid generator
            action.id,
            logType,
            '2026-01-01'
          );
        }).not.toThrow();
      });

      // Invalid log type
      expect(() => {
        db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date) VALUES (?, ?, ?, ?)').run(
          createTestUser().id,
          action.id,
          'invalid_type',
          '2026-01-01'
        );
      }).toThrow();
    });

    it('validates mood enum values', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const goal = createTestGoal(user.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title) VALUES (?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title) VALUES (?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title) VALUES (?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title);

      // Valid moods
      const validMoods = ['motivated', 'challenged', 'accomplished', 'frustrated', 'neutral'];
      validMoods.forEach(mood => {
        expect(() => {
          db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, mood) VALUES (?, ?, ?, ?, ?)').run(
            createTestUser().id,
            action.id,
            'note',
            '2026-01-01',
            mood
          );
        }).not.toThrow();
      });

      // Invalid mood
      expect(() => {
        db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, mood) VALUES (?, ?, ?, ?, ?)').run(
          createTestUser().id,
          action.id,
          'note',
          '2026-01-01',
          'invalid_mood'
        );
      }).toThrow();
    });

    it('validates goal status enum', () => {
      const user = createTestUser();
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(user.id, user.username, user.password_hash, user.email);

      const validStatuses = ['active', 'completed', 'archived'];
      validStatuses.forEach(status => {
        const goal = createTestGoal(user.id, { status });
        expect(() => {
          db.prepare('INSERT INTO primary_goals (id, user_id, title, status) VALUES (?, ?, ?, ?)')
            .run(goal.id, goal.user_id, goal.title, status);
        }).not.toThrow();
      });

      const invalidGoal = createTestGoal(user.id);
      expect(() => {
        db.prepare('INSERT INTO primary_goals (id, user_id, title, status) VALUES (?, ?, ?, ?)')
          .run(invalidGoal.id, invalidGoal.user_id, invalidGoal.title, 'invalid_status');
      }).toThrow();
    });
  });

  describe('Indexes', () => {
    it('creates all required indexes', () => {
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all() as { name: string }[];
      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_sub_goals_primary_goal');
      expect(indexNames).toContain('idx_action_items_sub_goal');
      expect(indexNames).toContain('idx_action_items_completed');
      expect(indexNames).toContain('idx_activity_logs_action');
      expect(indexNames).toContain('idx_activity_logs_date');
      expect(indexNames).toContain('idx_activity_logs_type');
      expect(indexNames).toContain('idx_guestbook_user');
      expect(indexNames).toContain('idx_guestbook_target');
      expect(indexNames).toContain('idx_primary_goals_user');
      expect(indexNames).toContain('idx_shared_goals_token');
      expect(indexNames).toContain('idx_shared_goals_goal');
      expect(indexNames).toContain('idx_agent_etiquette_user');
    });
  });
});
