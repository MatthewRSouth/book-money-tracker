'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RolloverSummary {
  groupCount: number;
  studentCount: number;
  bookCount: number;
  paymentCount: number;
  totalBalanceYen: number;
}

export interface ArchiveData {
  groups: { id: string; name: string; sort_order: number }[];
  books: { id: string; class_group_id: string; title: string; price_yen: number; sort_order: number }[];
  students: { id: string; class_group_id: string; name: string; balance_yen: number; notes: string | null }[];
  payments: { id: string; student_id: string; amount_yen: number; note: string | null; paid_at: string }[];
  student_books: { student_id: string; book_id: string; created_at: string }[];
}

export async function getRolloverSummary(): Promise<{ data: RolloverSummary | null; error: string | null }> {
  const supabase = await createClient();

  const [groups, students, books, payments] = await Promise.all([
    supabase.from('class_groups').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('balance_yen'),
    supabase.from('books').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('id', { count: 'exact', head: true }),
  ]);

  if (groups.error || students.error || books.error || payments.error) {
    return { data: null, error: 'Failed to load summary.' };
  }

  const totalBalanceYen = (students.data ?? []).reduce((sum, s) => sum + (s.balance_yen ?? 0), 0);

  return {
    data: {
      groupCount: groups.count ?? 0,
      studentCount: students.data?.length ?? 0,
      bookCount: books.count ?? 0,
      paymentCount: payments.count ?? 0,
      totalBalanceYen,
    },
    error: null,
  };
}

export async function getArchiveData(): Promise<{ data: ArchiveData | null; error: string | null }> {
  const supabase = await createClient();

  const [groups, books, students, payments, studentBooks] = await Promise.all([
    supabase.from('class_groups').select('id, name, sort_order').order('sort_order'),
    supabase.from('books').select('id, class_group_id, title, price_yen, sort_order').order('sort_order'),
    supabase.from('students').select('id, class_group_id, name, balance_yen, notes').order('created_at'),
    supabase.from('payments').select('id, student_id, amount_yen, note, paid_at').order('paid_at'),
    supabase.from('student_books').select('student_id, book_id, created_at'),
  ]);

  if (groups.error || books.error || students.error || payments.error || studentBooks.error) {
    return { data: null, error: 'Failed to fetch archive data.' };
  }

  return {
    data: {
      groups: groups.data ?? [],
      books: books.data ?? [],
      students: students.data ?? [],
      payments: payments.data ?? [],
      student_books: studentBooks.data ?? [],
    },
    error: null,
  };
}

export async function executeRollover(
  mode: 'keep_structure' | 'full_reset'
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const fn = mode === 'keep_structure' ? 'rollover_keep_structure' : 'rollover_full_reset';
  const { error } = await supabase.rpc(fn);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/overview');
  revalidatePath('/manage');
  return { error: null };
}
