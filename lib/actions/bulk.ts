'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bulkReceiveBook(
  bookId: string,
  classGroupId: string
): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('bulk_receive_book', {
    p_book_id: bookId,
    p_class_group_id: classGroupId,
  });
  if (error) return { count: 0, error: error.message };
  revalidatePath('/dashboard');
  return { count: data ?? 0, error: null };
}
