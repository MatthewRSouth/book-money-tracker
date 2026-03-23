'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addGroup(name: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('class_groups')
    .select('*', { count: 'exact', head: true });
  const { error } = await supabase
    .from('class_groups')
    .insert({ name, sort_order: (count ?? 0) + 1 });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/manage');
  return { error: null };
}

export async function updateGroup(
  groupId: string,
  name: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('class_groups')
    .update({ name })
    .eq('id', groupId);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/manage');
  return { error: null };
}

export async function deleteGroup(groupId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_class_group', { p_group_id: groupId });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/manage');
  return { error: null };
}

export async function reorderGroups(
  orderedIds: string[]
): Promise<{ error: string | null }> {
  if (orderedIds.length === 0) return { error: null };
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('class_groups').update({ sort_order: index + 1 }).eq('id', id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  revalidatePath('/dashboard');
  revalidatePath('/manage');
  return { error: null };
}
