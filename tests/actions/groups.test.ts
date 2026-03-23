import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpdate, mockEq } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      update: mockUpdate,
    }),
  }),
}));

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { reorderGroups } from '@/lib/actions/groups';

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ error: null });
});

describe('reorderGroups', () => {
  it('calls update with correct sort_order for each group', async () => {
    await reorderGroups(['group-1', 'group-2', 'group-3']);

    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { sort_order: 1 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { sort_order: 2 });
    expect(mockUpdate).toHaveBeenNthCalledWith(3, { sort_order: 3 });
  });

  it('calls eq with the correct group id for each update', async () => {
    await reorderGroups(['group-1', 'group-2', 'group-3']);

    expect(mockEq).toHaveBeenCalledTimes(3);
    expect(mockEq).toHaveBeenNthCalledWith(1, 'id', 'group-1');
    expect(mockEq).toHaveBeenNthCalledWith(2, 'id', 'group-2');
    expect(mockEq).toHaveBeenNthCalledWith(3, 'id', 'group-3');
  });

  it('calls revalidatePath for both routes on success', async () => {
    await reorderGroups(['group-1', 'group-2']);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/manage');
  });

  it('returns { error: null } on success', async () => {
    const result = await reorderGroups(['group-1']);
    expect(result.error).toBeNull();
  });

  it('returns error message if any update fails', async () => {
    mockEq
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'DB error' } });

    const result = await reorderGroups(['group-1', 'group-2']);
    expect(result.error).toBe('DB error');
  });

  it('does not call revalidatePath when an update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });

    await reorderGroups(['group-1']);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns { error: null } and skips all work for empty array', async () => {
    const result = await reorderGroups([]);
    expect(result.error).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
