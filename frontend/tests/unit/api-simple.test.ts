import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/api/client';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Envelope Validation', () => {
    it('returns data on successful response', async () => {
      const mockData = { id: '1', title: 'Test Goal' };
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({
          success: true,
          data: mockData,
          error: null
        })
      });

      const result = await api.getGoal('1');

      expect(result).toEqual(mockData);
    });

    it('throws error when success is false', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({
          success: false,
          data: null,
          error: 'Goal not found'
        })
      });

      await expect(api.getGoal('1')).rejects.toThrow('Goal not found');
    });

    it('throws error when response is not valid JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => 'Not JSON'
      });

      await expect(api.getGoal('1')).rejects.toThrow();
    });
  });

  describe('Goal API Methods', () => {
    it('getGoals calls correct endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: [], error: null })
      });

      await api.getGoals();

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/goals');
    });

    it('createGoal uses POST method', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: { id: '1' }, error: null })
      });

      await api.createGoal({ title: 'New Goal' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
    });

    it('deleteGoal uses DELETE method', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: { deleted: true }, error: null })
      });

      await api.deleteGoal('123');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/goals/123');
      expect(callArgs[1].method).toBe('DELETE');
    });
  });

  describe('Action API Methods', () => {
    it('toggleAction uses PATCH method', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: { completed: 1 }, error: null })
      });

      await api.toggleAction('action-1');

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/actions/action-1/complete');
      expect(callArgs[1].method).toBe('PATCH');
    });

    it('reorderAction sends targetPosition', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: { position: 3 }, error: null })
      });

      await api.reorderAction('action-1', 3);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.targetPosition).toBe(3);
    });
  });

  describe('Request Configuration', () => {
    it('includes credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: [], error: null })
      });

      await api.getGoals();

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].credentials).toBe('include');
    });

    it('sets Content-Type header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        text: async () => JSON.stringify({ success: true, data: { id: '1' }, error: null })
      });

      await api.createGoal({ title: 'Test' });

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });
  });
});
