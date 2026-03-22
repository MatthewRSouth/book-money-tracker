'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bulkAddStudents(
  rows: { name: string; balance_yen: number }[],
  classGroupId: string
): Promise<{ inserted: number; error: string | null }> {
  if (rows.length === 0) return { inserted: 0, error: null };

  const supabase = await createClient();
  const records = rows.map((r) => ({
    name: r.name,
    balance_yen: r.balance_yen,
    class_group_id: classGroupId,
  }));

  const { data, error } = await supabase.from('students').insert(records).select('id');
  if (error) return { inserted: 0, error: error.message };

  revalidatePath('/dashboard');
  return { inserted: data?.length ?? rows.length, error: null };
}
