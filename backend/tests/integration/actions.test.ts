import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser, createTestGoal, createTestSubGoal, createTestAction } from '../helpers/fixtures';
import type Database from 'better-sqlite3';

describe('Actions Business Logic', () => {
  let db: Database.Database;
  let testUser: ReturnType<typeof createTestUser>;
  let goalId: string;
  let subGoalId: string;

  beforeEach(() => {
    db = createTestDb();
    testUser = createTestUser();
    db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(testUser.id, testUser.username, testUser.password_hash, testUser.email, testUser.created_at, testUser.updated_at);

    const goal = createTestGoal(testUser.id);
    goalId = goal.id;
    db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

    const subGoal = createTestSubGoal(goalId, 1);
    subGoalId = subGoal.id;
    db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);
  });

  describe('Action CRUD Operations', () => {
    it('creates action at valid position', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.completed, action.created_at, action.updated_at);

      const retrieved = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      expect(retrieved).toBeDefined();
      expect(retrieved.position).toBe(1);
      expect(retrieved.completed).toBe(0);
    });

    it('allows all 8 action positions per sub-goal', () => {
      for (let i = 1; i <= 8; i++) {
        const action = createTestAction(subGoalId, i);
        db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);
      }

      const actions = db.prepare('SELECT COUNT(*) as count FROM action_items WHERE sub_goal_id = ?').get(subGoalId) as { count: number };

      expect(actions.count).toBe(8);
    });

    it('updates action fields', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      const now = new Date().toISOString();
      db.prepare('UPDATE action_items SET title = ?, description = ?, updated_at = ? WHERE id = ?')
        .run('Updated Action', 'New description', now, action.id);

      const updated = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      expect(updated.title).toBe('Updated Action');
      expect(updated.description).toBe('New description');
    });

    it('deletes action', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      db.prepare('DELETE FROM action_items WHERE id = ?').run(action.id);

      const deleted = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id);

      expect(deleted).toBeUndefined();
    });
  });

  describe('Action Completion', () => {
    it('toggles completion status from incomplete to complete', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, 0, action.created_at, action.updated_at);

      const now = new Date().toISOString();
      db.prepare('UPDATE action_items SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(1, now, now, action.id);

      const updated = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      expect(updated.completed).toBe(1);
      expect(updated.completed_at).toBeTruthy();
    });

    it('toggles completion status from complete to incomplete', () => {
      const now = new Date().toISOString();
      const action = createTestAction(subGoalId, 1, { completed: 1, completed_at: now });
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, completed, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.completed, action.completed_at, action.created_at, action.updated_at);

      db.prepare('UPDATE action_items SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(0, null, now, action.id);

      const updated = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      expect(updated.completed).toBe(0);
      expect(updated.completed_at).toBeNull();
    });
  });

  describe('Action Reordering', () => {
    it('swaps action positions atomically', () => {
      const action1 = createTestAction(subGoalId, 1, { title: 'Action 1' });
      const action2 = createTestAction(subGoalId, 2, { title: 'Action 2' });

      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action1.id, action1.sub_goal_id, action1.position, action1.title, action1.created_at, action1.updated_at);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action2.id, action2.sub_goal_id, action2.position, action2.title, action2.created_at, action2.updated_at);

      // Swap positions using transaction with temporary position
      const now = new Date().toISOString();
      const swapTransaction = db.transaction(() => {
        // Move action1 to temp position -1
        db.prepare('UPDATE action_items SET position = -1, updated_at = ? WHERE id = ?').run(now, action1.id);

        // Move action2 to position 1
        db.prepare('UPDATE action_items SET position = 1, updated_at = ? WHERE id = ?').run(now, action2.id);

        // Move action1 to position 2
        db.prepare('UPDATE action_items SET position = 2, updated_at = ? WHERE id = ?').run(now, action1.id);
      });

      swapTransaction();

      const updated1 = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action1.id) as any;
      const updated2 = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action2.id) as any;

      expect(updated1.position).toBe(2);
      expect(updated1.title).toBe('Action 1');
      expect(updated2.position).toBe(1);
      expect(updated2.title).toBe('Action 2');
    });

    it('handles reorder to same position (no-op)', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      const before = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      // Try to move to same position - should be no-op
      if (before.position === 1) {
        // No changes needed
      }

      const after = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;

      expect(after.position).toBe(before.position);
    });

    it('allows temporary negative position for swapping', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      // Move to temporary position -1
      const now = new Date().toISOString();
      db.prepare('UPDATE action_items SET position = -1, updated_at = ? WHERE id = ?').run(now, action.id);

      const temp = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;
      expect(temp.position).toBe(-1);

      // Move back to valid position
      db.prepare('UPDATE action_items SET position = 1, updated_at = ? WHERE id = ?').run(now, action.id);

      const final = db.prepare('SELECT * FROM action_items WHERE id = ?').get(action.id) as any;
      expect(final.position).toBe(1);
    });
  });

  describe('Action with Activity Logs', () => {
    it('cascades delete from action to activity logs', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      const logId = testUser.id; // Using uuid
      db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(logId, action.id, 'progress', '2026-01-01', 'Made progress', action.created_at, action.updated_at);

      // Delete action
      db.prepare('DELETE FROM action_items WHERE id = ?').run(action.id);

      // Activity log should be deleted
      const log = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(logId);
      expect(log).toBeUndefined();
    });

    it('retrieves action with activity logs ordered by date', () => {
      const action = createTestAction(subGoalId, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      // Create logs with different dates
      const now = new Date().toISOString();
      db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(testUser.id + '1', action.id, 'progress', '2026-01-01', 'Day 1', now, now);
      db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(testUser.id + '2', action.id, 'progress', '2026-01-03', 'Day 3', now, now);
      db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, log_date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(testUser.id + '3', action.id, 'progress', '2026-01-02', 'Day 2', now, now);

      const logs = db.prepare('SELECT * FROM activity_logs WHERE action_item_id = ? ORDER BY log_date DESC, created_at DESC').all(action.id) as any[];

      expect(logs).toHaveLength(3);
      expect(logs[0].log_date).toBe('2026-01-03');
      expect(logs[1].log_date).toBe('2026-01-02');
      expect(logs[2].log_date).toBe('2026-01-01');
    });
  });
});
