import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ClassGroup } from '@/types';
import ClassTabs from '@/components/ClassTabs';
import GlobalSearch from '@/components/GlobalSearch';
import LogoutButton from '@/components/LogoutButton';
import TabContent, { TabContentSkeleton } from '@/components/TabContent';

interface DashboardPageProps {
  searchParams: Promise<{ tab?: string; highlight?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch all class groups
  const { data: groups, error: groupsError } = await supabase
    .from('class_groups')
    .select('id, name, sort_order')
    .order('sort_order');

  if (groupsError || !groups || groups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        No class groups found. Check your Supabase setup.
      </div>
    );
  }

  // Resolve active tab + highlight
  const { tab, highlight } = await searchParams;
  const activeGroup: ClassGroup =
    groups.find((g) => g.id === tab) ?? groups[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">Book Money Tracker</h1>
          <div className="flex items-center gap-4">
            <Suspense>
              <GlobalSearch />
            </Suspense>
            <div className="flex gap-4 text-sm">
              <Link href="/overview" className="text-muted hover:text-primary transition-colors">
                Overview
              </Link>
              <Link href="/manage" className="text-muted hover:text-primary transition-colors">
                Manage groups
              </Link>
              <Link href="/rollover" className="text-muted hover:text-primary transition-colors">
                Rollover
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
        <Suspense>
          <ClassTabs groups={groups} activeGroupId={activeGroup.id} />
        </Suspense>
      </div>

      {/* Tab content streams in behind skeleton */}
      <Suspense fallback={<TabContentSkeleton />}>
        <TabContent
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          highlightStudentId={highlight}
        />
      </Suspense>
    </div>
  );
}
