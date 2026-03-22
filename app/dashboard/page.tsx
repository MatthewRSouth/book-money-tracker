import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ClassGroup, Book, StudentRow, GroupData } from '@/types';
import GlobalSearch from '@/components/GlobalSearch';
import LogoutButton from '@/components/LogoutButton';
import DashboardClient from '@/components/DashboardClient';

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

  // Fetch books, students, and received-book records for every group in parallel.
  // This runs all queries concurrently so tab switches are instant after load.
  const allGroupData: GroupData[] = await Promise.all(
    groups.map(async (group: ClassGroup) => {
      const [booksResult, studentsResult] = await Promise.all([
        supabase
          .from('books')
          .select('id, class_group_id, title, price_yen, sort_order')
          .eq('class_group_id', group.id)
          .order('sort_order'),
        supabase
          .from('students')
          .select('id, class_group_id, name, balance_yen, notes')
          .eq('class_group_id', group.id)
          .order('created_at'),
      ]);

      const books: Book[] = booksResult.data ?? [];
      const rawStudents = studentsResult.data ?? [];

      let receivedData: { student_id: string; book_id: string }[] = [];
      if (rawStudents.length > 0) {
        const { data } = await supabase
          .from('student_books')
          .select('student_id, book_id')
          .in('student_id', rawStudents.map((s) => s.id));
        receivedData = data ?? [];
      }

      const receivedMap = new Map<string, Set<string>>();
      for (const row of receivedData) {
        if (!receivedMap.has(row.student_id)) {
          receivedMap.set(row.student_id, new Set());
        }
        receivedMap.get(row.student_id)!.add(row.book_id);
      }

      const students: StudentRow[] = rawStudents.map((s) => ({
        ...s,
        received_book_ids: receivedMap.get(s.id) ?? new Set(),
      }));

      return { group, books, students };
    })
  );

  const { tab, highlight } = await searchParams;
  const initialGroup: ClassGroup =
    groups.find((g: ClassGroup) => g.id === tab) ?? groups[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Static header — renders immediately, no data dependency */}
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

      {/* All tab data is pre-loaded; switching is a pure client-side state change */}
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId={initialGroup.id}
        highlightStudentId={highlight}
      />
    </div>
  );
}
