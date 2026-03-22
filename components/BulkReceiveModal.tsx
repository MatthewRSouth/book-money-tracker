'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { bulkReceiveBook } from '@/lib/actions/bulk';
import type { Book, StudentRow } from '@/types';

interface BulkReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  classGroupId: string;
  students: StudentRow[];
  onSuccess: (bookId: string, priceYen: number) => void;
}

export default function BulkReceiveModal({
  isOpen,
  onClose,
  book,
  classGroupId,
  students,
  onSuccess,
}: BulkReceiveModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const missing = students.filter((s) => !s.received_book_ids.has(book.id));

  async function handleConfirm() {
    setLoading(true);
    setErrorMsg('');
    const { error } = await bulkReceiveBook(book.id, classGroupId);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    onSuccess(book.id, book.price_yen);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Distribute book to all students"
    >
      <div className="space-y-4">
        {missing.length === 0 ? (
          <p className="text-sm text-zinc-400">
            All students already have <strong className="text-zinc-200">{book.title}</strong>.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-300">
              Give <strong className="text-zinc-100">{book.title}</strong>{' '}
              (¥{book.price_yen.toLocaleString('ja-JP')}) to{' '}
              <strong className="text-zinc-100">{missing.length}</strong> student
              {missing.length !== 1 ? 's' : ''} who haven&apos;t received it yet?
            </p>

            <div className="max-h-40 overflow-y-auto rounded border border-zinc-700 bg-zinc-900">
              <ul className="divide-y divide-zinc-800">
                {missing.map((s) => (
                  <li key={s.id} className="px-3 py-1.5 text-sm text-zinc-300">
                    {s.name}
                  </li>
                ))}
              </ul>
            </div>

            {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Distributing…' : `Give to ${missing.length} student${missing.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {missing.length === 0 && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
