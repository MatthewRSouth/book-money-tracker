import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/session';
import type { ClassGroup } from '@/types';
import ManageGroupsTable from '@/components/ManageGroupsTable';

export default async function ManagePage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Manage groups</h1>
        <Link href="/dashboard" className="text-sm text-muted hover:text-primary transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Groups table streams in; the header above flushes first. */}
      <Suspense fallback={<ManageSkeleton />}>
        <ManageData />
      </Suspense>
    </div>
  );
}

async function ManageData() {
  const supabase = await createClient();

  const [groupsResult, studentsResult] = await Promise.all([
    supabase.from('class_groups').select('id, name, sort_order').order('sort_order'),
    supabase.from('students').select('class_group_id'),
  ]);

  const groups: ClassGroup[] = groupsResult.data ?? [];

  const studentCounts: Record<string, number> = {};
  for (const s of (studentsResult.data ?? [])) {
    studentCounts[s.class_group_id] = (studentCounts[s.class_group_id] ?? 0) + 1;
  }

  return <ManageGroupsTable groups={groups} studentCounts={studentCounts} />;
}

// Fallback for the table only (the header is rendered by the page).
function ManageSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-card border border-border overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 border-b border-border last:border-b-0" />
      ))}
    </div>
  );
}
