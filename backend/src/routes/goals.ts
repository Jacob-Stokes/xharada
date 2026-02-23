import { Router, Request, Response } from 'express';
import { db, PrimaryGoal, SubGoal, ActionItem } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all primary goals
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const goals = db.prepare('SELECT * FROM primary_goals WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json({ success: true, data: goals, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Get specific goal with full tree
router.get('/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const userId = req.user?.id;

    const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ? AND user_id = ?').get(goalId, userId) as PrimaryGoal | undefined;

    if (!goal) {
      return res.status(404).json({ success: false, data: null, error: 'Goal not found' });
    }

    const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goalId) as SubGoal[];

    const goalWithTree = {
      ...goal,
      subGoals: subGoals.map(subGoal => {
        const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(subGoal.id) as ActionItem[];
        return {
          ...subGoal,
          actions
        };
      })
    };

    res.json({ success: true, data: goalWithTree, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Get full tree structure
router.get('/:goalId/tree', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goalId) as PrimaryGoal | undefined;

    if (!goal) {
      return res.status(404).json({ success: false, data: null, error: 'Goal not found' });
    }

    const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goalId) as SubGoal[];

    const tree = {
      ...goal,
      subGoals: subGoals.map(subGoal => {
        const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(subGoal.id) as ActionItem[];
        return {
          ...subGoal,
          actions
        };
      })
    };

    res.json({ success: true, data: tree, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Create primary goal
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, target_date } = req.body;
    const userId = req.user?.id;

    if (!title) {
      return res.status(400).json({ success: false, data: null, error: 'Title is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO primary_goals (id, user_id, title, description, target_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, title, description || null, target_date || null, now, now);

    const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(id);

    res.status(201).json({ success: true, data: goal, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Update primary goal
router.put('/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { title, description, target_date, status } = req.body;

    const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goalId);

    if (!goal) {
      return res.status(404).json({ success: false, data: null, error: 'Goal not found' });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE primary_goals
      SET title = ?, description = ?, target_date = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(title, description || null, target_date || null, status || 'active', now, goalId);

    const updatedGoal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(goalId);

    res.json({ success: true, data: updatedGoal, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Delete primary goal
router.delete('/:goalId', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    const result = db.prepare('DELETE FROM primary_goals WHERE id = ?').run(goalId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Goal not found' });
    }

    res.json({ success: true, data: { deleted: true }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Get sub-goals for a primary goal
router.get('/:goalId/subgoals', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    const subGoals = db.prepare('SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position').all(goalId);

    res.json({ success: true, data: subGoals, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Create sub-goal
router.post('/:goalId/subgoals', (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { position, title, description } = req.body;

    if (!title || !position) {
      return res.status(400).json({ success: false, data: null, error: 'Title and position are required' });
    }

    if (position < 1 || position > 8) {
      return res.status(400).json({ success: false, data: null, error: 'Position must be between 1 and 8' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO sub_goals (id, primary_goal_id, position, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, goalId, position, title, description || null, now, now);

    const subGoal = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(id);

    res.status(201).json({ success: true, data: subGoal, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

export default router;
