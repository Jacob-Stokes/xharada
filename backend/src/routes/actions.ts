import { Router, Request, Response } from 'express';
import { db, ActionItem } from '../db/database';

const router = Router();

// Get specific action item
router.get('/:actionId', (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const action = db.prepare('SELECT * FROM action_items WHERE id = ?').get(actionId) as ActionItem | undefined;

    if (!action) {
      return res.status(404).json({ success: false, data: null, error: 'Action item not found' });
    }

    res.json({ success: true, data: action, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Update action item
router.put('/:actionId', (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;
    const { title, description, position, due_date } = req.body;

    const action = db.prepare('SELECT * FROM action_items WHERE id = ?').get(actionId);

    if (!action) {
      return res.status(404).json({ success: false, data: null, error: 'Action item not found' });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE action_items
      SET title = ?, description = ?, position = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(title, description || null, position, due_date || null, now, actionId);

    const updated = db.prepare('SELECT * FROM action_items WHERE id = ?').get(actionId);

    res.json({ success: true, data: updated, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Toggle completion status
router.patch('/:actionId/complete', (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const action = db.prepare('SELECT * FROM action_items WHERE id = ?').get(actionId) as ActionItem | undefined;

    if (!action) {
      return res.status(404).json({ success: false, data: null, error: 'Action item not found' });
    }

    const newCompleted = action.completed ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE action_items
      SET completed = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(newCompleted, completedAt, now, actionId);

    const updated = db.prepare('SELECT * FROM action_items WHERE id = ?').get(actionId);

    res.json({ success: true, data: updated, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Delete action item
router.delete('/:actionId', (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const result = db.prepare('DELETE FROM action_items WHERE id = ?').run(actionId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Action item not found' });
    }

    res.json({ success: true, data: { deleted: true }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

export default router;
