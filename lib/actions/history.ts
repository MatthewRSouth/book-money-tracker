'use server';

import { createClient } from '@/lib/supabase/server';
import type { HistoryEntry } from '@/types';

export async function getStudentHistory(
  studentId: string
): Promise<{ entries: HistoryEntry[]; error: string | null }> {
  const supabase = await createClient();

  const [paymentsResult, distributionsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount_yen, note, paid_at, created_at')
      .eq('student_id', studentId),
    supabase
      .from('student_books')
      .select('book_id, created_at, books(title, price_yen)')
      .eq('student_id', studentId),
  ]);

  if (paymentsResult.error) return { entries: [], error: paymentsResult.error.message };
  if (distributionsResult.error) return { entries: [], error: distributionsResult.error.message };

  const paymentEntries: HistoryEntry[] = (paymentsResult.data ?? []).map((p) => ({
    id: p.id,
    type: 'payment' as const,
    date: p.paid_at,
    amount_yen: p.amount_yen,
    label: p.note ?? 'Payment received',
    created_at: p.created_at,
  }));

  const bookEntries: HistoryEntry[] = (distributionsResult.data ?? []).map((sb) => {
    const book = sb.books as unknown as { title: string; price_yen: number };
    return {
      id: `${sb.book_id}-${sb.created_at}`,
      type: 'book' as const,
      date: (sb.created_at as string).split('T')[0],
      amount_yen: -(book?.price_yen ?? 0),
      label: book?.title ?? 'Unknown book',
      created_at: sb.created_at as string,
    };
  });

  const entries = [...paymentEntries, ...bookEntries].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.created_at.localeCompare(a.created_at);
  });

  return { entries, error: null };
}
