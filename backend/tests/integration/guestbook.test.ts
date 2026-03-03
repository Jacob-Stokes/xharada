import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser, createTestGoal, createTestSubGoal, createTestAction } from '../helpers/fixtures';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

describe('Guestbook', () => {
  let db: Database.Database;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    db = createTestDb();
    testUser = createTestUser();
    db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(testUser.id, testUser.username, testUser.password_hash, testUser.email, testUser.created_at, testUser.updated_at);
  });

  describe('CRUD Operations', () => {
    it('creates a guestbook entry at user level', () => {
      const id = uuid();
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
        .run(id, testUser.id, 'Coach AI', 'Great progress!', 'user');

      const entry = db.prepare('SELECT * FROM guestbook WHERE id = ?').get(id) as any;
      expect(entry).toBeDefined();
      expect(entry.agent_name).toBe('Coach AI');
      expect(entry.comment).toBe('Great progress!');
      expect(entry.target_type).toBe('user');
      expect(entry.target_id).toBeNull();
    });

    it('creates entries at goal/subgoal/action levels', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      // Goal-level
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Goal comment', 'goal', goal.id);

      // Subgoal-level
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Sub-goal comment', 'subgoal', subGoal.id);

      // Action-level
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Action comment', 'action', action.id);

      const entries = db.prepare('SELECT * FROM guestbook WHERE user_id = ?').all(testUser.id) as any[];
      expect(entries).toHaveLength(3);

      const types = entries.map((e: any) => e.target_type).sort();
      expect(types).toEqual(['action', 'goal', 'subgoal']);
    });

    it('filters entries by target_type', () => {
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'User comment', 'user');
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type, target_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Goal comment', 'goal', uuid());

      const userEntries = db.prepare('SELECT * FROM guestbook WHERE user_id = ? AND target_type = ?').all(testUser.id, 'user') as any[];
      expect(userEntries).toHaveLength(1);
      expect(userEntries[0].comment).toBe('User comment');
    });
  });

  describe('Constraints', () => {
    it('rejects invalid target_type', () => {
      expect(() => {
        db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
          .run(uuid(), testUser.id, 'Agent', 'Bad', 'invalid');
      }).toThrow();
    });

    it('requires agent_name and comment', () => {
      expect(() => {
        db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
          .run(uuid(), testUser.id, null, 'Comment', 'user');
      }).toThrow();

      expect(() => {
        db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
          .run(uuid(), testUser.id, 'Agent', null, 'user');
      }).toThrow();
    });
  });

  describe('Cascade Delete', () => {
    it('deletes guestbook entries when user is deleted', () => {
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Comment 1', 'user');
      db.prepare('INSERT INTO guestbook (id, user_id, agent_name, comment, target_type) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Agent', 'Comment 2', 'user');

      db.prepare('DELETE FROM users WHERE id = ?').run(testUser.id);

      const entries = db.prepare('SELECT * FROM guestbook WHERE user_id = ?').all(testUser.id) as any[];
      expect(entries).toHaveLength(0);
    });
  });
});
