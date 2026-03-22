'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getArchiveData, executeRollover } from '@/lib/actions/rollover';
import type { RolloverSummary } from '@/lib/actions/rollover';

interface RolloverClientProps {
  summary: RolloverSummary;
}

type Mode = 'keep_structure' | 'full_reset';

async function downloadArchive() {
  const { data, error } = await getArchiveData();
  if (error || !data) {
    alert('Failed to fetch archive data. Please try again.');
    return;
  }

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const toSheet = (rows: Record<string, unknown>[]) =>
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['(empty)']]);

  XLSX.utils.book_append_sheet(wb, toSheet(data.groups as any), 'Groups');
  XLSX.utils.book_append_sheet(wb, toSheet(data.books as any), 'Books');
  XLSX.utils.book_append_sheet(wb, toSheet(data.students as any), 'Students');
  XLSX.utils.book_append_sheet(wb, toSheet(data.payments as any), 'Payments');
  XLSX.utils.book_append_sheet(wb, toSheet(data.student_books as any), 'StudentBooks');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `archive-${today}.xlsx`);
}

export default function RolloverClient({ summary }: RolloverClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('keep_structure');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const confirmed = confirmation === 'ROLLOVER';

  async function handleArchive() {
    setArchiveLoading(true);
    await downloadArchive();
    setArchiveLoading(false);
  }

  async function handleRollover() {
    if (!confirmed) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await executeRollover(mode);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Archive download */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-1">Step 1 — Download archive</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Saves all current data (groups, books, students, payments) to an Excel file.
        </p>
        <button
          onClick={handleArchive}
          disabled={archiveLoading || summary.studentCount === 0}
          className="px-4 py-2 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {archiveLoading ? 'Preparing…' : 'Download archive (.xlsx)'}
        </button>
        {summary.studentCount === 0 && (
          <p className="mt-2 text-xs text-zinc-600">No students to archive.</p>
        )}
      </div>

      {/* Mode selection */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Step 2 — Choose rollover mode</h2>
        <div className="space-y-3">
          <label className="flex gap-3 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="keep_structure"
              checked={mode === 'keep_structure'}
              onChange={() => setMode('keep_structure')}
              className="mt-0.5 accent-teal-500"
            />
            <div>
              <p className="text-sm text-zinc-100 font-medium">Keep groups &amp; books</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Clears students and payments. Groups and book lists stay intact. Use this at the start of each school year.
              </p>
            </div>
          </label>
          <label className="flex gap-3 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="full_reset"
              checked={mode === 'full_reset'}
              onChange={() => setMode('full_reset')}
              className="mt-0.5 accent-teal-500"
            />
            <div>
              <p className="text-sm text-zinc-100 font-medium">Full reset</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Deletes everything — groups, books, students, and payments. Start completely from scratch.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Confirm + execute */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-1">Step 3 — Confirm</h2>
        <p className="text-xs text-zinc-500 mb-3">Type ROLLOVER to enable the button.</p>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="ROLLOVER"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 mb-4"
        />

        {errorMsg && <p className="text-sm text-red-400 mb-3">{errorMsg}</p>}

        <button
          onClick={handleRollover}
          disabled={!confirmed || loading}
          className="w-full px-4 py-2 text-sm rounded-lg bg-red-700 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Running rollover…' : mode === 'keep_structure' ? 'Clear students & payments' : 'Delete all data'}
        </button>
      </div>
    </div>
  );
}
