'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function recordPayment(
  studentId: string,
  amountYen: number,
  note: string | null,
  paidAt: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('record_payment', {
    p_student_id: studentId,
    p_amount_yen: amountYen,
    p_note: note,
    p_paid_at: paidAt,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}
