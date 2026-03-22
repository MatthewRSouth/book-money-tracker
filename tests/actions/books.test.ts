import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

const { mockRevalidatePath } = vi.hoisted(() => ({ mockRevalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { updateBook, deleteBook } from '@/lib/actions/books';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateBook', () => {
  it('calls update_book RPC — not direct .update()', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await updateBook('book-1', 'Textbook A', 3000);
    expect(mockRpc).toHaveBeenCalledWith('update_book', {
      p_book_id: 'book-1',
      p_title: 'Textbook A',
      p_price_yen: 3000,
    });
  });

  it('calls revalidatePath on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await updateBook('book-1', 'Textbook A', 3000);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error on failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC error' } });
    const result = await updateBook('book-1', 'Textbook A', 3000);
    expect(result.error).toBe('RPC error');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteBook', () => {
  it('calls delete_book_restore_balances RPC', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await deleteBook('book-1');
    expect(mockRpc).toHaveBeenCalledWith('delete_book_restore_balances', {
      p_book_id: 'book-1',
    });
  });

  it('calls revalidatePath on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await deleteBook('book-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error on failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'Restore failed' } });
    const result = await deleteBook('book-1');
    expect(result.error).toBe('Restore failed');
  });
});
