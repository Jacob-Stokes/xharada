import { Router, Request, Response } from 'express';
import { db, GuestbookEntry } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all guestbook entries for current user
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { target_type, target_id } = req.query;

    let query = 'SELECT * FROM guestbook WHERE user_id = ?';
    const params: any[] = [userId];

    if (target_type) {
      query += ' AND target_type = ?';
      params.push(target_type);
    }

    if (target_id) {
      query += ' AND target_id = ?';
      params.push(target_id);
    }

    query += ' ORDER BY created_at DESC';

    const entries = db.prepare(query).all(...params) as GuestbookEntry[];

    res.json({ success: true, data: entries, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Create guestbook entry
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { agent_name, comment, target_type, target_id } = req.body;

    if (!agent_name || !comment || !target_type) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'agent_name, comment, and target_type are required'
      });
    }

    if (!['user', 'goal', 'subgoal', 'action'].includes(target_type)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'target_type must be one of: user, goal, subgoal, action'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO guestbook (id, user_id, agent_name, comment, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, agent_name, comment, target_type, target_id || null, now);

    const entry = db.prepare('SELECT * FROM guestbook WHERE id = ?').get(id);

    res.status(201).json({ success: true, data: entry, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// Delete guestbook entry
router.delete('/:entryId', (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const userId = req.user?.id;

    // Ensure user can only delete their own entries
    const result = db.prepare('DELETE FROM guestbook WHERE id = ? AND user_id = ?').run(entryId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, data: null, error: 'Entry not found' });
    }

    res.json({ success: true, data: { deleted: true }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

export default router;
