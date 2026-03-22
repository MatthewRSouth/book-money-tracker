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

export async function moveBook(
  bookId: string,
  direction: 'up' | 'down',
  classGroupId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: books, error: fetchError } = await supabase
    .from('books')
    .select('id, sort_order')
    .eq('class_group_id', classGroupId)
    .order('sort_order');

  if (fetchError || !books) return { error: fetchError?.message ?? 'Failed to fetch books' };

  const idx = books.findIndex((b) => b.id === bookId);
  if (idx === -1) return { error: 'Book not found' };

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= books.length) return { error: null };

  const current = books[idx];
  const swap = books[swapIdx];

  // Use a temp value to avoid unique constraint conflicts
  const tempOrder = Math.max(...books.map((b) => b.sort_order)) + 999;
  await supabase.from('books').update({ sort_order: tempOrder }).eq('id', current.id);
  await supabase.from('books').update({ sort_order: current.sort_order }).eq('id', swap.id);
  await supabase.from('books').update({ sort_order: swap.sort_order }).eq('id', current.id);

  revalidatePath('/dashboard');
  return { error: null };
}
