import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

import { toggleBook } from '@/lib/actions/toggle';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toggleBook', () => {
  it('calls receive_book RPC when receiving=true', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await toggleBook('student-1', 'book-1', true);
    expect(mockRpc).toHaveBeenCalledWith('receive_book', {
      p_student_id: 'student-1',
      p_book_id: 'book-1',
    });
  });

  it('calls return_book RPC when receiving=false', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await toggleBook('student-1', 'book-1', false);
    expect(mockRpc).toHaveBeenCalledWith('return_book', {
      p_student_id: 'student-1',
      p_book_id: 'book-1',
    });
  });

  it('returns null error on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    const result = await toggleBook('student-1', 'book-1', true);
    expect(result.error).toBeNull();
  });

  it('returns error message on failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC failed' } });
    const result = await toggleBook('student-1', 'book-1', true);
    expect(result.error).toBe('RPC failed');
  });
});
