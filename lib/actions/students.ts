'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addStudent(
  name: string,
  balanceYen: number,
  classGroupId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from('students').insert({
    name,
    balance_yen: balanceYen,
    class_group_id: classGroupId,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateStudent(
  studentId: string,
  name: string,
  balanceYen: number,
  notes: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_student', {
    p_student_id: studentId,
    p_name: name,
    p_balance_yen: balanceYen,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteStudent(
  studentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_student', {
    p_student_id: studentId,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}

export async function moveStudentToGroup(
  studentId: string,
  newGroupId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('move_student_to_group', {
    p_student_id: studentId,
    p_new_group_id: newGroupId,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { error: null };
}
