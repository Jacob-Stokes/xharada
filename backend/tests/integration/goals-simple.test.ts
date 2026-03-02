import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '../helpers/testDb';
import { createTestUser, createTestGoal, createTestSubGoal, createTestAction } from '../helpers/fixtures';
import type Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

describe('Goals Business Logic', () => {
  let db: Database.Database;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    db = createTestDb();
    testUser = createTestUser();
    db.prepare('INSERT INTO users (id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(testUser.id, testUser.username, testUser.password_hash, testUser.email, testUser.created_at, testUser.updated_at);
  });

  describe('Goal CRUD Operations', () => {
    it('creates and retrieves a goal', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, description, target_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.description, goal.target_date, goal.status, goal.created_at, goal.updated_at);

      const retrieved = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goal.id) as any;

      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe('Test Goal');
      expect(retrieved.user_id).toBe(testUser.id);
    });

    it('filters goals by user_id', () => {
      const goal1 = createTestGoal(testUser.id, { title: 'User 1 Goal' });
      const otherUser = createTestUser({ id: uuid(), username: 'otheruser' });
      const goal2 = createTestGoal(otherUser.id, { title: 'User 2 Goal' });

      db.prepare('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)')
        .run(otherUser.id, otherUser.username, otherUser.password_hash, otherUser.email);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal1.id, goal1.user_id, goal1.title, goal1.created_at, goal1.updated_at);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal2.id, goal2.user_id, goal2.title, goal2.created_at, goal2.updated_at);

      const userGoals = db.prepare('SELECT * FROM primary_goals WHERE user_id = ?').all(testUser.id) as any[];

      expect(userGoals).toHaveLength(1);
      expect(userGoals[0].title).toBe('User 1 Goal');
    });

    it('updates goal fields', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      const now = new Date().toISOString();
      db.prepare('UPDATE primary_goals SET title = ?, status = ?, updated_at = ? WHERE id = ?')
        .run('Updated Goal', 'completed', now, goal.id);

      const updated = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goal.id) as any;

      expect(updated.title).toBe('Updated Goal');
      expect(updated.status).toBe('completed');
    });

    it('deletes goal', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      db.prepare('DELETE FROM primary_goals WHERE id = ?').run(goal.id);

      const deleted = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goal.id);

      expect(deleted).toBeUndefined();
    });
  });

  describe('Goal Tree Structure', () => {
    it('retrieves complete goal tree with sub-goals and actions', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);

      const action = createTestAction(subGoal.id, 1);
      db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(action.id, action.sub_goal_id, action.position, action.title, action.created_at, action.updated_at);

      // Get goal
      const retrievedGoal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goal.id) as any;

      // Get sub-goals
      const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goal.id) as any[];

      // Get actions for each sub-goal
      const subGoalsWithActions = subGoals.map(sg => {
        const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(sg.id) as any[];
        return { ...sg, actions };
      });

      expect(retrievedGoal).toBeDefined();
      expect(subGoalsWithActions).toHaveLength(1);
      expect(subGoalsWithActions[0].actions).toHaveLength(1);
    });

    it('orders sub-goals by position', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      // Create sub-goals out of order
      const subGoal3 = createTestSubGoal(goal.id, 3);
      const subGoal1 = createTestSubGoal(goal.id, 1);
      const subGoal2 = createTestSubGoal(goal.id, 2);

      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal3.id, subGoal3.primary_goal_id, subGoal3.position, subGoal3.title, subGoal3.created_at, subGoal3.updated_at);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal1.id, subGoal1.primary_goal_id, subGoal1.position, subGoal1.title, subGoal1.created_at, subGoal1.updated_at);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal2.id, subGoal2.primary_goal_id, subGoal2.position, subGoal2.title, subGoal2.created_at, subGoal2.updated_at);

      const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goal.id) as any[];

      expect(subGoals[0].position).toBe(1);
      expect(subGoals[1].position).toBe(2);
      expect(subGoals[2].position).toBe(3);
    });
  });

  describe('Bulk Import', () => {
    it('imports complete goal tree in transaction', () => {
      const goalId = uuid();
      const subGoalId = uuid();
      const actionId = uuid();
      const now = new Date().toISOString();

      const importTransaction = db.transaction(() => {
        db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run(goalId, testUser.id, 'Imported Goal', now, now);

        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(subGoalId, goalId, 1, 'Imported Sub-goal', now, now);

        db.prepare('INSERT INTO action_items (id, sub_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(actionId, subGoalId, 1, 'Imported Action', now, now);
      });

      importTransaction();

      const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goalId) as any;
      const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ?').all(goalId) as any[];
      const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ?').all(subGoalId) as any[];

      expect(goal).toBeDefined();
      expect(subGoals).toHaveLength(1);
      expect(actions).toHaveLength(1);
    });

    it('rolls back transaction on error', () => {
      const goalId = uuid();
      const now = new Date().toISOString();

      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM primary_goals').get() as { count: number };

      try {
        const failingTransaction = db.transaction(() => {
          db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            .run(goalId, testUser.id, 'Valid Goal', now, now);

          // This will fail - duplicate position
          db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuid(), goalId, 1, 'Sub 1', now, now);
          db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuid(), goalId, 1, 'Sub 2 (duplicate position)', now, now); // Duplicate position
        });

        failingTransaction();
      } catch (error) {
        // Expected to fail
      }

      const afterCount = db.prepare('SELECT COUNT(*) as count FROM primary_goals').get() as { count: number };

      // Count should be unchanged due to rollback
      expect(afterCount.count).toBe(beforeCount.count);
    });
  });

  describe('Sub-goal Management', () => {
    it('creates sub-goal at valid position', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      const subGoal = createTestSubGoal(goal.id, 1);
      db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);

      const retrieved = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(subGoal.id) as any;

      expect(retrieved).toBeDefined();
      expect(retrieved.position).toBe(1);
    });

    it('allows all 8 sub-goal positions', () => {
      const goal = createTestGoal(testUser.id);
      db.prepare('INSERT INTO primary_goals (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(goal.id, goal.user_id, goal.title, goal.created_at, goal.updated_at);

      for (let i = 1; i <= 8; i++) {
        const subGoal = createTestSubGoal(goal.id, i);
        db.prepare('INSERT INTO sub_goals (id, primary_goal_id, position, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(subGoal.id, subGoal.primary_goal_id, subGoal.position, subGoal.title, subGoal.created_at, subGoal.updated_at);
      }

      const subGoals = db.prepare('SELECT COUNT(*) as count FROM sub_goals WHERE primary_goal_id = ?').get(goal.id) as { count: number };

      expect(subGoals.count).toBe(8);
    });
  });
});
