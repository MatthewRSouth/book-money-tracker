'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addBook(
  title: string,
  priceYen: number,
  classGroupId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Place new book after existing ones
  const { count } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('class_group_id', classGroupId);

  const { error } = await supabase.from('books').insert({
    title,
    price_yen: priceYen,
    class_group_id: classGroupId,
    sort_order: (count ?? 0) + 1,
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateBook(
  bookId: string,
  title: string,
  priceYen: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_book', {
    p_book_id: bookId,
    p_title: title,
    p_price_yen: priceYen,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteBook(
  bookId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_book_restore_balances', {
    p_book_id: bookId,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}
