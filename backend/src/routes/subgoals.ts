import { Router, Request, Response } from 'express';
import { db, SubGoal } from '../db/database';

const router = Router();

// Get specific sub-goal with actions
router.get('/:subgoalId', (req: Request, res: Response) => {
  try {
    const { subgoalId } = req.params;

    const subGoal = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(subgoalId) as SubGoal | undefined;

    if (!subGoal) {
      return res.status(404).json({ success: false, data: null, error: 'Sub-goal not found' });
    }

    const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(subgoalId);

    res.json({ success: true, data: { ...subGoal, actions }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Update sub-goal
router.put('/:subgoalId', (req: Request, res: Response) => {
  try {
    const { subgoalId } = req.params;
    const { title, description, position } = req.body;

    const subGoal = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(subgoalId);

    if (!subGoal) {
      return res.status(404).json({ success: false, data: null, error: 'Sub-goal not found' });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE sub_goals
      SET title = ?, description = ?, position = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(title, description || null, position, now, subgoalId);

    const updated = db.prepare('SELECT * FROM sub_goals WHERE id = ?').get(subgoalId);

    res.json({ success: true, data: updated, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Delete sub-goal
router.delete('/:subgoalId', (req: Request, res: Response) => {
  try {
    const { subgoalId } = req.params;

    const result = db.prepare('DELETE FROM sub_goals WHERE id = ?').run(subgoalId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Sub-goal not found' });
    }

    res.json({ success: true, data: { deleted: true }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Get actions for sub-goal
router.get('/:subgoalId/actions', (req: Request, res: Response) => {
  try {
    const { subgoalId } = req.params;

    const actions = db.prepare('SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position').all(subgoalId);

    res.json({ success: true, data: actions, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Create action item
router.post('/:subgoalId/actions', (req: Request, res: Response) => {
  try {
    const { subgoalId } = req.params;
    const { position, title, description, due_date } = req.body;

    if (!title || !position) {
      return res.status(400).json({ success: false, data: null, error: 'Title and position are required' });
    }

    if (position < 1 || position > 8) {
      return res.status(400).json({ success: false, data: null, error: 'Position must be between 1 and 8' });
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO action_items (id, sub_goal_id, position, title, description, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, subgoalId, position, title, description || null, due_date || null, now, now);

    const action = db.prepare('SELECT * FROM action_items WHERE id = ?').get(id);

    res.status(201).json({ success: true, data: action, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

export default router;
