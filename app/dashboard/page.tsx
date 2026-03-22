import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ClassGroup, Book, StudentRow } from '@/types';
import ClassTabs from '@/components/ClassTabs';
import SummaryBar from '@/components/SummaryBar';
import StudentTable from '@/components/StudentTable';

interface DashboardPageProps {
  searchParams: Promise<{ tab?: string }>;
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
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        No class groups found. Check your Supabase setup.
      </div>
    );
  }

  // Resolve active tab
  const { tab } = await searchParams;
  const activeGroup: ClassGroup =
    groups.find((g) => g.id === tab) ?? groups[0];

  // Fetch books and students for the active group in parallel
  const [booksResult, studentsResult] = await Promise.all([
    supabase
      .from('books')
      .select('id, class_group_id, title, price_yen, sort_order')
      .eq('class_group_id', activeGroup.id)
      .order('sort_order'),
    supabase
      .from('students')
      .select('id, class_group_id, name, balance_yen, notes')
      .eq('class_group_id', activeGroup.id)
      .order('created_at'),
  ]);

  const books: Book[] = booksResult.data ?? [];
  const rawStudents = studentsResult.data ?? [];

  // Fetch which books each student has received
  let receivedData: { student_id: string; book_id: string }[] = [];
  if (rawStudents.length > 0) {
    const studentIds = rawStudents.map((s) => s.id);
    const { data } = await supabase
      .from('student_books')
      .select('student_id, book_id')
      .in('student_id', studentIds);
    receivedData = data ?? [];
  }

  // Build a map: student_id → Set<book_id>
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

  // Compute summary stats
  const totalBalance = students.reduce((sum, s) => sum + s.balance_yen, 0);
  const fullyPaidOut = students.filter(
    (s) => books.length > 0 && books.every((b) => s.received_book_ids.has(b.id))
  ).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 mb-4">Book Money Tracker</h1>
        <Suspense>
          <ClassTabs groups={groups} activeGroupId={activeGroup.id} />
        </Suspense>
      </div>

      {/* Summary bar */}
      <SummaryBar
        studentCount={students.length}
        totalBalance={totalBalance}
        fullyPaidOut={fullyPaidOut}
      />

      {/* Student table */}
      <StudentTable
        books={books}
        students={students}
        classGroupId={activeGroup.id}
        classGroupName={activeGroup.name}
      />
    </div>
  );
}
