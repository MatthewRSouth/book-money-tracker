import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

const { mockRevalidatePath } = vi.hoisted(() => ({ mockRevalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { recordPayment } from '@/lib/actions/payments';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordPayment', () => {
  it('calls record_payment RPC with correct params', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await recordPayment('student-1', 5000, 'Cash envelope', '2026-03-22');
    expect(mockRpc).toHaveBeenCalledWith('record_payment', {
      p_student_id: 'student-1',
      p_amount_yen: 5000,
      p_note: 'Cash envelope',
      p_paid_at: '2026-03-22',
    });
  });

  it('passes null note when no note provided', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await recordPayment('student-1', 5000, null, '2026-03-22');
    expect(mockRpc).toHaveBeenCalledWith('record_payment', expect.objectContaining({
      p_note: null,
    }));
  });

  it('calls revalidatePath on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await recordPayment('student-1', 5000, null, '2026-03-22');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('returns error on failure', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'Payment failed' } });
    const result = await recordPayment('student-1', 5000, null, '2026-03-22');
    expect(result.error).toBe('Payment failed');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
