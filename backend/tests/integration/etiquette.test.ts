import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser } from '../helpers/fixtures';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

describe('Agent Etiquette', () => {
  let db: Database.Database;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    db = createTestDb();
    testUser = createTestUser();
    db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(testUser.id, testUser.username, testUser.password_hash, testUser.email, testUser.created_at, testUser.updated_at);
  });

  describe('CRUD Operations', () => {
    it('creates an etiquette rule', () => {
      const id = uuid();
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(id, testUser.id, 'Use emojis for subgoals', 0, 0);

      const rule = db.prepare('SELECT * FROM agent_etiquette WHERE id = ?').get(id) as any;
      expect(rule).toBeDefined();
      expect(rule.content).toBe('Use emojis for subgoals');
      expect(rule.position).toBe(0);
      expect(rule.is_default).toBe(0);
    });

    it('retrieves rules ordered by position', () => {
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Rule C', 2, 0);
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Rule A', 0, 1);
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Rule B', 1, 1);

      const rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ? ORDER BY position').all(testUser.id) as any[];

      expect(rules).toHaveLength(3);
      expect(rules[0].content).toBe('Rule A');
      expect(rules[1].content).toBe('Rule B');
      expect(rules[2].content).toBe('Rule C');
    });

    it('updates a rule content', () => {
      const id = uuid();
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(id, testUser.id, 'Original text', 0, 0);

      db.prepare('UPDATE agent_etiquette SET content = ? WHERE id = ?').run('Updated text', id);

      const updated = db.prepare('SELECT * FROM agent_etiquette WHERE id = ?').get(id) as any;
      expect(updated.content).toBe('Updated text');
    });

    it('deletes a rule', () => {
      const id = uuid();
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(id, testUser.id, 'To be deleted', 0, 0);

      db.prepare('DELETE FROM agent_etiquette WHERE id = ?').run(id);

      const deleted = db.prepare('SELECT * FROM agent_etiquette WHERE id = ?').get(id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('User Isolation', () => {
    it('rules are scoped to user', () => {
      const otherUser = createTestUser({ id: uuid(), username: 'otheruser' });
      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(otherUser.id, otherUser.username, otherUser.password_hash, otherUser.email);

      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'User 1 rule', 0, 0);
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), otherUser.id, 'User 2 rule', 0, 0);

      const user1Rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ?').all(testUser.id) as any[];
      const user2Rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ?').all(otherUser.id) as any[];

      expect(user1Rules).toHaveLength(1);
      expect(user1Rules[0].content).toBe('User 1 rule');
      expect(user2Rules).toHaveLength(1);
      expect(user2Rules[0].content).toBe('User 2 rule');
    });
  });

  describe('Cascade Delete', () => {
    it('deletes etiquette rules when user is deleted', () => {
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Rule 1', 0, 1);
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Rule 2', 1, 0);

      db.prepare('DELETE FROM users WHERE id = ?').run(testUser.id);

      const rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ?').all(testUser.id) as any[];
      expect(rules).toHaveLength(0);
    });
  });

  describe('Default Seeding', () => {
    it('seeds default rules for a user', () => {
      const defaults = [
        'Keep the Harada structure (goal → sub-goal → 8 actions) intact.',
        'Use positive, coaching language when writing updates.',
        'Ask before deleting goals or sub-goals.',
        'Surface blockers or ambiguities in the guestbook.',
      ];

      const insert = db.prepare(
        'INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, 1)'
      );
      defaults.forEach((content, i) => {
        insert.run(uuid(), testUser.id, content, i);
      });

      const rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ? ORDER BY position').all(testUser.id) as any[];

      expect(rules).toHaveLength(4);
      expect(rules.every((r: any) => r.is_default === 1)).toBe(true);
      expect(rules[0].content).toContain('Harada structure');
    });

    it('reset replaces custom rules with defaults', () => {
      // Add custom rule
      db.prepare('INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), testUser.id, 'Custom rule', 0, 0);

      // Reset: delete all, re-seed
      db.prepare('DELETE FROM agent_etiquette WHERE user_id = ?').run(testUser.id);

      const defaults = ['Default 1', 'Default 2'];
      const insert = db.prepare(
        'INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, 1)'
      );
      defaults.forEach((content, i) => {
        insert.run(uuid(), testUser.id, content, i);
      });

      const rules = db.prepare('SELECT * FROM agent_etiquette WHERE user_id = ?').all(testUser.id) as any[];
      expect(rules).toHaveLength(2);
      expect(rules.every((r: any) => r.is_default === 1)).toBe(true);
    });
  });
});
