import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, AgentEtiquette } from '../db/database';

const router = Router();

const DEFAULT_ETIQUETTE = [
  'Keep the Harada structure (goal → sub-goal → 8 actions) intact.',
  'Use positive, coaching language when writing updates.',
  'Ask before deleting goals or sub-goals.',
  'Surface blockers or ambiguities in the guestbook.',
];

// GET /api/etiquette - List all etiquette rules for the authenticated user
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let rules = db
      .prepare('SELECT * FROM agent_etiquette WHERE user_id = ? ORDER BY position')
      .all(userId) as AgentEtiquette[];

    // If no rules exist, seed defaults
    if (rules.length === 0) {
      const insert = db.prepare(
        'INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, 1)'
      );
      DEFAULT_ETIQUETTE.forEach((content, i) => {
        insert.run(crypto.randomUUID(), userId, content, i);
      });
      rules = db
        .prepare('SELECT * FROM agent_etiquette WHERE user_id = ? ORDER BY position')
        .all(userId) as AgentEtiquette[];
    }

    res.json({ success: true, data: rules, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// POST /api/etiquette - Add a new etiquette rule
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, data: null, error: 'Content is required' });
    }

    // Get next position
    const last = db
      .prepare('SELECT MAX(position) as maxPos FROM agent_etiquette WHERE user_id = ?')
      .get(userId) as any;
    const position = (last?.maxPos ?? -1) + 1;

    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, 0)'
    ).run(id, userId, content.trim(), position);

    const rule = db.prepare('SELECT * FROM agent_etiquette WHERE id = ?').get(id) as AgentEtiquette;
    res.json({ success: true, data: rule, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// PUT /api/etiquette/:id - Update a rule's content
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, data: null, error: 'Content is required' });
    }

    const existing = db
      .prepare('SELECT * FROM agent_etiquette WHERE id = ? AND user_id = ?')
      .get(id, userId) as AgentEtiquette | undefined;

    if (!existing) {
      return res.status(404).json({ success: false, data: null, error: 'Rule not found' });
    }

    db.prepare('UPDATE agent_etiquette SET content = ? WHERE id = ?').run(content.trim(), id);
    const updated = db.prepare('SELECT * FROM agent_etiquette WHERE id = ?').get(id) as AgentEtiquette;
    res.json({ success: true, data: updated, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// DELETE /api/etiquette/:id - Remove a rule
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = db
      .prepare('SELECT * FROM agent_etiquette WHERE id = ? AND user_id = ?')
      .get(id, userId) as AgentEtiquette | undefined;

    if (!existing) {
      return res.status(404).json({ success: false, data: null, error: 'Rule not found' });
    }

    db.prepare('DELETE FROM agent_etiquette WHERE id = ?').run(id);

    // Re-number positions
    const remaining = db
      .prepare('SELECT id FROM agent_etiquette WHERE user_id = ? ORDER BY position')
      .all(userId) as any[];
    const updatePos = db.prepare('UPDATE agent_etiquette SET position = ? WHERE id = ?');
    remaining.forEach((r: any, i: number) => updatePos.run(i, r.id));

    res.json({ success: true, data: { deleted: id }, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

// POST /api/etiquette/reset - Reset to defaults
router.post('/reset', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    db.prepare('DELETE FROM agent_etiquette WHERE user_id = ?').run(userId);

    const insert = db.prepare(
      'INSERT INTO agent_etiquette (id, user_id, content, position, is_default) VALUES (?, ?, ?, ?, 1)'
    );
    DEFAULT_ETIQUETTE.forEach((content, i) => {
      insert.run(crypto.randomUUID(), userId, content, i);
    });

    const rules = db
      .prepare('SELECT * FROM agent_etiquette WHERE user_id = ? ORDER BY position')
      .all(userId) as AgentEtiquette[];

    res.json({ success: true, data: rules, error: null });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: (error as Error).message });
  }
});

export default router;
