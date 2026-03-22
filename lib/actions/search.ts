'use server';

import { createClient } from '@/lib/supabase/server';
import type { SearchResult } from '@/types';

export async function searchStudents(query: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, name, class_group_id, class_groups(name)')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
    .limit(10);

  if (error || !data) return [];

  return data.map((row: any) => ({
    student_id: row.id,
    student_name: row.name,
    group_id: row.class_group_id,
    group_name: row.class_groups?.name ?? '',
  }));
}
