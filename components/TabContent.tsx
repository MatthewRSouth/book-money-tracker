import { createClient } from '@/lib/supabase/server';
import type { Book, StudentRow } from '@/types';
import SummaryBar from '@/components/SummaryBar';
import StudentTable from '@/components/StudentTable';

interface TabContentProps {
  groupId: string;
  groupName: string;
  highlightStudentId?: string;
}

export default async function TabContent({ groupId, groupName, highlightStudentId }: TabContentProps) {
  const supabase = await createClient();

  const [booksResult, studentsResult] = await Promise.all([
    supabase
      .from('books')
      .select('id, class_group_id, title, price_yen, sort_order')
      .eq('class_group_id', groupId)
      .order('sort_order'),
    supabase
      .from('students')
      .select('id, class_group_id, name, balance_yen, notes')
      .eq('class_group_id', groupId)
      .order('created_at'),
  ]);

  const books: Book[] = booksResult.data ?? [];
  const rawStudents = studentsResult.data ?? [];

  let receivedData: { student_id: string; book_id: string }[] = [];
  if (rawStudents.length > 0) {
    const studentIds = rawStudents.map((s) => s.id);
    const { data } = await supabase
      .from('student_books')
      .select('student_id, book_id')
      .in('student_id', studentIds);
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

  const totalBalance = students.reduce((sum, s) => sum + s.balance_yen, 0);
  const fullyPaidOut = students.filter(
    (s) => books.length > 0 && books.every((b) => s.received_book_ids.has(b.id))
  ).length;

  return (
    <>
      <SummaryBar
        studentCount={students.length}
        totalBalance={totalBalance}
        fullyPaidOut={fullyPaidOut}
      />
      <StudentTable
        books={books}
        students={students}
        classGroupId={groupId}
        classGroupName={groupName}
        highlightStudentId={highlightStudentId}
      />
    </>
  );
}

export function TabContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Summary bar skeleton */}
      <div className="flex gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 flex-1 rounded-xl bg-border" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-border/60" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 border-t border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
