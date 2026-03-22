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
