import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/api/client';

global.fetch = vi.fn();

describe('Etiquette API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getEtiquette calls correct endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: [], error: null })
    });

    await api.getEtiquette();

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/etiquette');
    expect(callArgs[1].credentials).toBe('include');
  });

  it('createEtiquette uses POST with content body', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: { id: '1', content: 'New rule' }, error: null })
    });

    await api.createEtiquette('New rule');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/etiquette');
    expect(callArgs[1].method).toBe('POST');
    const body = JSON.parse(callArgs[1].body);
    expect(body.content).toBe('New rule');
  });

  it('updateEtiquette uses PUT with id and content', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: { id: 'abc', content: 'Updated' }, error: null })
    });

    await api.updateEtiquette('abc', 'Updated');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/etiquette/abc');
    expect(callArgs[1].method).toBe('PUT');
    const body = JSON.parse(callArgs[1].body);
    expect(body.content).toBe('Updated');
  });

  it('deleteEtiquette uses DELETE with id', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: { deleted: 'abc' }, error: null })
    });

    await api.deleteEtiquette('abc');

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/etiquette/abc');
    expect(callArgs[1].method).toBe('DELETE');
  });

  it('resetEtiquette uses POST to /reset', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      text: async () => JSON.stringify({ success: true, data: [], error: null })
    });

    await api.resetEtiquette();

    const callArgs = (global.fetch as any).mock.calls[0];
    expect(callArgs[0]).toContain('/api/etiquette/reset');
    expect(callArgs[1].method).toBe('POST');
  });
});
