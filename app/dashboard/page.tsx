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

  // Fetch books and students (with their received books) for every group in parallel.
  // student_books are loaded via a relational select so each group needs only 2 queries
  // instead of 3 (eliminates the sequential student_books fetch after students load).
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
          .select('id, class_group_id, name, balance_yen, notes, student_books(book_id)')
          .eq('class_group_id', group.id)
          .order('created_at'),
      ]);

      const books: Book[] = booksResult.data ?? [];
      const rawStudents = (studentsResult.data ?? []) as Array<{
        id: string;
        class_group_id: string;
        name: string;
        balance_yen: number;
        notes: string | null;
        student_books: { book_id: string }[];
      }>;

      const students: StudentRow[] = rawStudents.map((s) => ({
        id: s.id,
        class_group_id: s.class_group_id,
        name: s.name,
        balance_yen: s.balance_yen,
        notes: s.notes,
        received_book_ids: new Set(s.student_books.map((sb) => sb.book_id)),
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
      <div className="mb-6 sm:mb-4 space-y-4 sm:space-y-0">
        {/* Row 1: title + actions */}
        <div className="relative flex items-center justify-center sm:justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground text-center sm:text-left">Book Money Tracker</h1>
          {/* Desktop: search + nav all in one row */}
          <div className="hidden sm:flex items-center gap-4">
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
          {/* Mobile: logout pinned to the right */}
          <div className="sm:hidden absolute right-0">
            <LogoutButton />
          </div>
        </div>
        {/* Mobile-only rows: search + nav */}
        <div className="sm:hidden space-y-4">
          <div className="mx-8">
            <Suspense>
              <GlobalSearch />
            </Suspense>
          </div>
          <nav className="flex justify-around text-sm">
            <Link href="/overview" className="text-muted hover:text-primary transition-colors whitespace-nowrap">
              Overview
            </Link>
            <Link href="/manage" className="text-muted hover:text-primary transition-colors whitespace-nowrap">
              Manage groups
            </Link>
            <Link href="/rollover" className="text-muted hover:text-primary transition-colors whitespace-nowrap">
              Rollover
            </Link>
          </nav>
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
