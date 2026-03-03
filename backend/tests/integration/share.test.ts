import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser, createTestGoal, createTestSubGoal, createTestAction, createTestActivityLog } from '../helpers/fixtures';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

describe('Shared Goals', () => {
  let db: Database.Database;
  let testUser: ReturnType<typeof createTestUser>;
  let testGoal: ReturnType<typeof createTestGoal>;

  beforeEach(() => {
    db = createTestDb();
    testUser = createTestUser();
    db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(testUser.id, testUser.username, testUser.password_hash, testUser.email, testUser.created_at, testUser.updated_at);

    testGoal = createTestGoal(testUser.id);
    db.prepare('INSERT INTO primary_goals (id, user_id, title, description, target_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(testGoal.id, testGoal.user_id, testGoal.title, testGoal.description, testGoal.target_date, testGoal.status, testGoal.created_at, testGoal.updated_at);
  });

  describe('Share Link CRUD', () => {
    it('creates a share link with token', () => {
      const id = uuid();
      const token = crypto.randomBytes(16).toString('base64url');

      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token, show_logs, show_guestbook) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, testGoal.id, testUser.id, token, 1, 0);

      const share = db.prepare('SELECT * FROM shared_goals WHERE id = ?').get(id) as any;
      expect(share).toBeDefined();
      expect(share.token).toBe(token);
      expect(share.show_logs).toBe(1);
      expect(share.show_guestbook).toBe(0);
      expect(share.is_active).toBe(1);
    });

    it('finds share by token', () => {
      const token = crypto.randomBytes(16).toString('base64url');
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, token);

      const share = db.prepare('SELECT * FROM shared_goals WHERE token = ? AND is_active = 1').get(token) as any;
      expect(share).toBeDefined();
      expect(share.goal_id).toBe(testGoal.id);
    });

    it('revokes a share link by setting is_active = 0', () => {
      const id = uuid();
      const token = crypto.randomBytes(16).toString('base64url');
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(id, testGoal.id, testUser.id, token);

      db.prepare('UPDATE shared_goals SET is_active = 0 WHERE id = ?').run(id);

      const share = db.prepare('SELECT * FROM shared_goals WHERE token = ? AND is_active = 1').get(token);
      expect(share).toBeUndefined();

      const inactive = db.prepare('SELECT * FROM shared_goals WHERE id = ?').get(id) as any;
      expect(inactive.is_active).toBe(0);
    });

    it('enforces unique tokens', () => {
      const token = crypto.randomBytes(16).toString('base64url');
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, token);

      expect(() => {
        db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
          .run(uuid(), testGoal.id, testUser.id, token);
      }).toThrow();
    });
  });

  describe('Share with Goal Tree', () => {
    it('retrieves full goal tree via share token', () => {
      const token = crypto.randomBytes(16).toString('base64url');
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token, show_logs) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, token, 1);

      // Build tree
      const subGoal = createTestSubGoal(testGoal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      const log = createTestActivityLog(action.id);
      db.prepare('INSERT INTO activity_logs (id, action_item_id, log_type, content, log_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(log.id, log.action_item_id, log.log_type, log.content, log.log_date, log.created_at, log.updated_at);

      // Look up share
      const share = db.prepare('SELECT * FROM shared_goals WHERE token = ? AND is_active = 1').get(token) as any;
      expect(share).toBeDefined();

      // Get goal
      const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(share.goal_id) as any;
      expect(goal).toBeDefined();
      expect(goal.title).toBe('Test Goal');

      // Get sub-goals
      const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goal.id) as any[];
      expect(subGoals).toHaveLength(1);

      // Get actions
      const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(subGoals[0].id) as any[];
      expect(actions).toHaveLength(1);

      // Get logs (if show_logs)
      if (share.show_logs) {
        const logs = db.prepare('SELECT * FROM activity_logs WHERE action_item_id = ?').all(actions[0].id) as any[];
        expect(logs).toHaveLength(1);
      }
    });
  });

  describe('Cascade Delete', () => {
    it('deletes share links when goal is deleted', () => {
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, crypto.randomBytes(16).toString('base64url'));
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, crypto.randomBytes(16).toString('base64url'));

      db.prepare('DELETE FROM primary_goals WHERE id = ?').run(testGoal.id);

      const shares = db.prepare('SELECT * FROM shared_goals WHERE goal_id = ?').all(testGoal.id) as any[];
      expect(shares).toHaveLength(0);
    });

    it('deletes share links when user is deleted', () => {
      db.prepare('INSERT INTO shared_goals (id, goal_id, user_id, token) VALUES (?, ?, ?, ?)')
        .run(uuid(), testGoal.id, testUser.id, crypto.randomBytes(16).toString('base64url'));

      db.prepare('DELETE FROM users WHERE id = ?').run(testUser.id);

      const shares = db.prepare('SELECT * FROM shared_goals WHERE user_id = ?').all(testUser.id) as any[];
      expect(shares).toHaveLength(0);
    });
  });
});
