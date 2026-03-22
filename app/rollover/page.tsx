import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getRolloverSummary } from '@/lib/actions/rollover';
import RolloverClient from './RolloverClient';

export default async function RolloverPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const { data: summary, error } = await getRolloverSummary();

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-sm">
        Failed to load summary. Please try again.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-xl mx-auto">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-teal-300 transition-colors">
        ← Back to dashboard
      </Link>

      <h1 className="text-xl font-semibold text-zinc-100 mt-6 mb-2">Year Rollover</h1>

      <div className="mb-6 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-sm text-amber-300">
        This will permanently delete student records. Download the archive before proceeding.
      </div>

      {/* Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Current data</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-zinc-400">Groups</dt>
          <dd className="text-zinc-100 font-medium">{summary.groupCount}</dd>
          <dt className="text-zinc-400">Students</dt>
          <dd className="text-zinc-100 font-medium">{summary.studentCount}</dd>
          <dt className="text-zinc-400">Books</dt>
          <dd className="text-zinc-100 font-medium">{summary.bookCount}</dd>
          <dt className="text-zinc-400">Payment records</dt>
          <dd className="text-zinc-100 font-medium">{summary.paymentCount}</dd>
          <dt className="text-zinc-400">Total balance</dt>
          <dd className={`font-medium ${summary.totalBalanceYen >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ¥{summary.totalBalanceYen.toLocaleString('ja-JP')}
          </dd>
        </dl>
      </div>

      <RolloverClient summary={summary} />
    </div>
  );
}
