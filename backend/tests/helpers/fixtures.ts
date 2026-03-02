import { v4 as uuid } from 'uuid';

export function createTestUser(overrides = {}) {
  return {
    id: uuid(),
    username: 'testuser',
    password_hash: '$2a$10$dummyhash',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestGoal(userId: string, overrides = {}) {
  return {
    id: uuid(),
    user_id: userId,
    title: 'Test Goal',
    description: 'Test goal description',
    target_date: '2026-12-31',
    status: 'active' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestSubGoal(goalId: string, position: number, overrides = {}) {
  return {
    id: uuid(),
    primary_goal_id: goalId,
    position,
    title: `Sub-goal ${position}`,
    description: `Sub-goal ${position} description`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestAction(subGoalId: string, position: number, overrides = {}) {
  return {
    id: uuid(),
    sub_goal_id: subGoalId,
    position,
    title: `Action ${position}`,
    description: `Action ${position} description`,
    completed: 0,
    completed_at: null,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestActivityLog(actionId: string, overrides = {}) {
  return {
    id: uuid(),
    action_item_id: actionId,
    log_type: 'progress' as const,
    content: 'Made progress on action',
    log_date: new Date().toISOString().split('T')[0],
    duration_minutes: 30,
    metric_value: null,
    metric_unit: null,
    media_url: null,
    media_type: null,
    external_link: null,
    mood: 'motivated' as const,
    tags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
