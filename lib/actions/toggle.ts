'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleBook(
  studentId: string,
  bookId: string,
  receiving: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(receiving ? 'receive_book' : 'return_book', {
    p_student_id: studentId,
    p_book_id: bookId,
  });
  return { error: error?.message ?? null };
}
