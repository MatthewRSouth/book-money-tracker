import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ClassGroup } from '@/types';
import ManageGroupsTable from '@/components/ManageGroupsTable';

export default async function ManagePage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [groupsResult, studentsResult] = await Promise.all([
    supabase.from('class_groups').select('id, name, sort_order').order('sort_order'),
    supabase.from('students').select('class_group_id'),
  ]);

  const groups: ClassGroup[] = groupsResult.data ?? [];

  const studentCounts: Record<string, number> = {};
  for (const s of (studentsResult.data ?? [])) {
    studentCounts[s.class_group_id] = (studentCounts[s.class_group_id] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Manage groups</h1>
        <Link href="/dashboard" className="text-sm text-muted hover:text-primary transition-colors">
          ← Dashboard
        </Link>
      </div>
      <ManageGroupsTable groups={groups} studentCounts={studentCounts} />
    </div>
  );
}
