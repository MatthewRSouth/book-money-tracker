import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/utils/formatYen';

export default async function OverviewPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [groupsResult, studentsResult, booksResult, studentBooksResult] = await Promise.all([
    supabase.from('class_groups').select('id, name, sort_order').order('sort_order'),
    supabase.from('students').select('id, class_group_id, name, balance_yen'),
    supabase.from('books').select('id, class_group_id'),
    supabase.from('student_books').select('student_id, book_id'),
  ]);

  const groups = groupsResult.data ?? [];
  const allStudents = studentsResult.data ?? [];
  const allBooks = booksResult.data ?? [];
  const allStudentBooks = studentBooksResult.data ?? [];

  const groupNameMap = new Map(groups.map((g) => [g.id, g.name]));

  // Books per group
  const booksByGroup = new Map<string, string[]>();
  for (const b of allBooks) {
    if (!booksByGroup.has(b.class_group_id)) booksByGroup.set(b.class_group_id, []);
    booksByGroup.get(b.class_group_id)!.push(b.id);
  }

  // Received books per student
  const receivedByStudent = new Map<string, Set<string>>();
  for (const sb of allStudentBooks) {
    if (!receivedByStudent.has(sb.student_id)) receivedByStudent.set(sb.student_id, new Set());
    receivedByStudent.get(sb.student_id)!.add(sb.book_id);
  }

  // Categorise students
  const negativeBalances = allStudents
    .filter((s) => s.balance_yen < 0)
    .sort((a, b) => a.balance_yen - b.balance_yen);

  const noBooks = allStudents.filter((s) => {
    const groupBooks = booksByGroup.get(s.class_group_id) ?? [];
    if (groupBooks.length === 0) return false;
    const received = receivedByStudent.get(s.id) ?? new Set();
    return received.size === 0;
  });

  const fullyDistributed = allStudents.filter((s) => {
    const groupBooks = booksByGroup.get(s.class_group_id) ?? [];
    if (groupBooks.length === 0) return false;
    const received = receivedByStudent.get(s.id) ?? new Set();
    return groupBooks.every((bId) => received.has(bId));
  });

  // Group summaries
  const groupSummaries = groups.map((g) => {
    const students = allStudents.filter((s) => s.class_group_id === g.id);
    return {
      id: g.id,
      name: g.name,
      studentCount: students.length,
      totalBalance: students.reduce((sum, s) => sum + s.balance_yen, 0),
      bookCount: (booksByGroup.get(g.id) ?? []).length,
    };
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <Link href="/dashboard" className="text-sm text-muted hover:text-primary transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Group summaries */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Groups</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupSummaries.map((g) => (
            <div key={g.id} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="font-medium text-foreground mb-2">{g.name}</p>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted">Students</p>
                  <p className="text-foreground">{g.studentCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Books</p>
                  <p className="text-foreground">{g.bookCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Total balance</p>
                  <p className={g.totalBalance < 0 ? 'text-red-500' : 'text-foreground'}>
                    {formatYen(g.totalBalance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Negative balances */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
          Negative balances ({negativeBalances.length})
        </h2>
        {negativeBalances.length === 0 ? (
          <p className="text-sm text-muted">None — all balances are positive.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/70">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {negativeBalances.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{groupNameMap.get(s.class_group_id) ?? '—'}</td>
                    <td className="px-4 py-3 text-red-500 font-medium whitespace-nowrap">{formatYen(s.balance_yen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* No books yet */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
          No books distributed yet ({noBooks.length})
        </h2>
        {noBooks.length === 0 ? (
          <p className="text-sm text-muted">All students have received at least one book.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/70">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {noBooks.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{groupNameMap.get(s.class_group_id) ?? '—'}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatYen(s.balance_yen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Fully distributed */}
      <section>
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
          All books distributed ({fullyDistributed.length})
        </h2>
        {fullyDistributed.length === 0 ? (
          <p className="text-sm text-muted">No students have received every book in their group yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/70">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fullyDistributed.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{groupNameMap.get(s.class_group_id) ?? '—'}</td>
                    <td className={`px-4 py-3 font-medium whitespace-nowrap ${s.balance_yen < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatYen(s.balance_yen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
