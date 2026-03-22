'use client';

import { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import { getStudentHistory } from '@/lib/actions/history';
import { formatYen } from '@/lib/utils/formatYen';
import type { HistoryEntry, StudentRow } from '@/types';

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRow;
}

export default function StudentHistoryModal({
  isOpen,
  onClose,
  student,
}: StudentHistoryModalProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    getStudentHistory(student.id).then(({ entries: e, error: err }) => {
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        setEntries(e);
      }
    });
  }, [isOpen, student.id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`History — ${student.name}`}>
      <div className="max-h-96 overflow-y-auto -mx-1 px-1">
        {loading && (
          <p className="text-sm text-zinc-400 py-6 text-center">Loading…</p>
        )}
        {!loading && error && (
          <p className="text-sm text-red-400 py-6 text-center">{error}</p>
        )}
        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-zinc-500 py-6 text-center">No history yet.</p>
        )}
        {!loading && !error && entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm text-zinc-100 truncate">{entry.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{entry.date}</p>
            </div>
            <span
              className={`text-sm font-medium tabular-nums shrink-0 ${
                entry.type === 'payment' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {entry.type === 'payment' ? '+' : ''}{formatYen(entry.amount_yen)}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
