import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db, PrimaryGoal, SubGoal, ActionItem, ActivityLog, SharedGoal } from '../db/database';

// Authenticated routes for managing share links
export const shareManagementRouter = Router();

// Create a share link
shareManagementRouter.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { goal_id, show_logs, show_guestbook } = req.body;

    if (!goal_id) {
      return res.status(400).json({ success: false, error: 'goal_id is required' });
    }

    // Verify goal belongs to user
    const goal = db.prepare('SELECT id FROM primary_goals WHERE id = ? AND user_id = ?').get(goal_id, userId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const id = uuidv4();
    const token = randomBytes(16).toString('base64url');

    db.prepare(`
      INSERT INTO shared_goals (id, goal_id, user_id, token, show_logs, show_guestbook)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, goal_id, userId, token, show_logs ? 1 : 0, show_guestbook ? 1 : 0);

    const share = db.prepare('SELECT * FROM shared_goals WHERE id = ?').get(id);

    res.json({ success: true, data: share });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List share links (optionally filter by goal_id)
shareManagementRouter.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = req.query.goal_id as string;

    let shares;
    if (goalId) {
      shares = db.prepare(
        'SELECT * FROM shared_goals WHERE user_id = ? AND goal_id = ? AND is_active = 1 ORDER BY created_at DESC'
      ).all(userId, goalId);
    } else {
      shares = db.prepare(
        'SELECT * FROM shared_goals WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
      ).all(userId);
    }

    res.json({ success: true, data: shares });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revoke a share link
shareManagementRouter.delete('/:shareId', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { shareId } = req.params;

    const result = db.prepare(
      'DELETE FROM shared_goals WHERE id = ? AND user_id = ?'
    ).run(shareId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Share link not found' });
    }

    res.json({ success: true, data: { message: 'Share link revoked' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public routes for viewing shared goals (no auth)
export const sharePublicRouter = Router();

sharePublicRouter.get('/:token/goal', (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const share = db.prepare(
      'SELECT * FROM shared_goals WHERE token = ? AND is_active = 1'
    ).get(token) as SharedGoal | undefined;

    if (!share) {
      return res.status(404).json({ success: false, error: 'Share link not found or has been revoked' });
    }

    // Fetch goal
    const goal = db.prepare('SELECT * FROM primary_goals WHERE id = ?').get(share.goal_id) as PrimaryGoal | undefined;
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal no longer exists' });
    }

    // Fetch subgoals + actions
    const subGoals = db.prepare(
      'SELECT * FROM sub_goals WHERE primary_goal_id = ? ORDER BY position'
    ).all(share.goal_id) as SubGoal[];

    const subGoalsWithActions = subGoals.map((subGoal) => {
      const actions = db.prepare(
        'SELECT * FROM action_items WHERE sub_goal_id = ? ORDER BY position'
      ).all(subGoal.id) as ActionItem[];

      return {
        ...subGoal,
        actions: actions.map((action) => {
          const result: any = { ...action };
          if (share.show_logs) {
            result.logs = db.prepare(
              'SELECT * FROM activity_logs WHERE action_item_id = ? ORDER BY log_date DESC, created_at DESC'
            ).all(action.id) as ActivityLog[];
          } else {
            result.logs = [];
          }
          return result;
        }),
      };
    });

    // Conditionally include guestbook
    let guestbook: any[] = [];
    if (share.show_guestbook) {
      guestbook = db.prepare(
        'SELECT * FROM guestbook WHERE user_id = ? AND ((target_type = ? AND target_id = ?) OR target_type IN (?, ?, ?)) ORDER BY created_at DESC'
      ).all(share.user_id, 'goal', share.goal_id, 'subgoal', 'action', 'user');

      // Filter subgoal/action entries to only those belonging to this goal
      const subGoalIds = new Set(subGoals.map(sg => sg.id));
      const actionIds = new Set(subGoalsWithActions.flatMap(sg => sg.actions.map((a: any) => a.id)));

      guestbook = guestbook.filter((entry: any) => {
        if (entry.target_type === 'goal') return entry.target_id === share.goal_id;
        if (entry.target_type === 'subgoal') return subGoalIds.has(entry.target_id);
        if (entry.target_type === 'action') return actionIds.has(entry.target_id);
        if (entry.target_type === 'user') return true;
        return false;
      });
    }

    res.json({
      success: true,
      data: {
        goal: {
          ...goal,
          subGoals: subGoalsWithActions,
        },
        guestbook,
        shareSettings: {
          show_logs: share.show_logs === 1,
          show_guestbook: share.show_guestbook === 1,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
