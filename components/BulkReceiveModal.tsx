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
          <p className="text-sm text-muted">
            All students already have <strong className="text-foreground">{book.title}</strong>.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              Give <strong>{book.title}</strong>{' '}
              (¥{book.price_yen.toLocaleString('ja-JP')}) to{' '}
              <strong>{missing.length}</strong> student
              {missing.length !== 1 ? 's' : ''} who haven&apos;t received it yet?
            </p>

            <div className="max-h-40 overflow-y-auto rounded border border-border bg-card">
              <ul className="divide-y divide-border">
                {missing.map((s) => (
                  <li key={s.id} className="px-3 py-1.5 text-sm text-foreground">
                    {s.name}
                  </li>
                ))}
              </ul>
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-1.5 text-sm rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted hover:bg-background transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
