import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/api/client';

global.fetch = vi.fn();

describe('Share API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createShareLink uses POST with goal_id and settings', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: { id: '1', token: 'abc123' }, error: null })
    });

    await api.createShareLink({ goal_id: 'g1', show_logs: true, show_guestbook: false });

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/share');
    expect(callArgs[1].method).toBe('POST');
    const body = JSON.parse(callArgs[1].body);
    expect(body.goal_id).toBe('g1');
    expect(body.show_logs).toBe(true);
    expect(body.show_guestbook).toBe(false);
  });

  it('getShareLinks calls correct endpoint with optional goalId', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: [], error: null })
    });

    await api.getShareLinks('g1');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/share?goal_id=g1');
  });

  it('getShareLinks works without goalId', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: [], error: null })
    });

    await api.getShareLinks();

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toMatch(/\/api\/share$/);
  });

  it('deleteShareLink uses DELETE with id', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: { deleted: true }, error: null })
    });

    await api.deleteShareLink('share-1');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/share/share-1');
    expect(callArgs[1].method).toBe('DELETE');
  });

  it('getSharedGoal uses plain fetch without credentials', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { goal: {}, guestbook: [] } })
    });

    await api.getSharedGoal('token-abc');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/shared/token-abc/goal');
    // Should NOT include credentials (plain fetch)
    expect(callArgs[1]).toBeUndefined();
  });

  it('getSharedGoal throws on error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Share link expired' })
    });

    await expect(api.getSharedGoal('bad-token')).rejects.toThrow('Share link expired');
  });
});
