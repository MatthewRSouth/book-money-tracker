import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockInsert } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({ insert: mockInsert }),
    rpc: mockRpc,
  }),
}));

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { updateStudent, deleteStudent } from '@/lib/actions/students';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateStudent', () => {
  it('calls update_student RPC with correct params', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await updateStudent('student-1', 'Alice', 15000, 'Some note');
    expect(mockRpc).toHaveBeenCalledWith('update_student', {
      p_student_id: 'student-1',
      p_name: 'Alice',
      p_balance_yen: 15000,
      p_notes: 'Some note',
    });
  });

  it('calls revalidatePath on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await updateStudent('student-1', 'Alice', 15000, null);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error message on RPC failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'DB error' } });
    const result = await updateStudent('student-1', 'Alice', 15000, null);
    expect(result.error).toBe('DB error');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteStudent', () => {
  it('calls delete_student RPC with correct params', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await deleteStudent('student-1');
    expect(mockRpc).toHaveBeenCalledWith('delete_student', {
      p_student_id: 'student-1',
    });
  });

  it('calls revalidatePath on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await deleteStudent('student-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error message on failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'Not found' } });
    const result = await deleteStudent('student-1');
    expect(result.error).toBe('Not found');
  });
});
