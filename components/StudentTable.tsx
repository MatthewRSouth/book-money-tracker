'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, StudentRow } from '@/types';
import BookCheckbox from './BookCheckbox';
import BalanceCell from './BalanceCell';
import AddStudentModal from './AddStudentModal';
import AddBookModal from './AddBookModal';
import { toggleBook } from '@/lib/actions/toggle';

interface StudentTableProps {
  books: Book[];
  students: StudentRow[];
  classGroupId: string;
  classGroupName: string;
}

type FlashState = Record<string, 'up' | 'down' | null>;

export default function StudentTable({
  books,
  students: initialStudents,
  classGroupId,
  classGroupName,
}: StudentTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [localStudents, setLocalStudents] = useState<StudentRow[]>(initialStudents);
  const [flashState, setFlashState] = useState<FlashState>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync when server re-renders with fresh data (e.g., after adding a student/book)
  useEffect(() => {
    setLocalStudents(initialStudents);
  }, [initialStudents]);

  async function handleToggle(studentId: string, bookId: string, bookPrice: number, currentlyChecked: boolean) {
    const receiving = !currentlyChecked;
    const pendingKey = `${studentId}:${bookId}`;

    // Prevent double-clicks
    if (pending.has(pendingKey)) return;

    // Optimistic update
    setPending((p) => new Set(p).add(pendingKey));
    setLocalStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const newIds = new Set(s.received_book_ids);
        if (receiving) {
          newIds.add(bookId);
        } else {
          newIds.delete(bookId);
        }
        return {
          ...s,
          received_book_ids: newIds,
          balance_yen: s.balance_yen + (receiving ? -bookPrice : bookPrice),
        };
      })
    );
    setFlashState((f) => ({ ...f, [studentId]: receiving ? 'down' : 'up' }));
    setTimeout(() => setFlashState((f) => ({ ...f, [studentId]: null })), 700);

    const { error } = await toggleBook(studentId, bookId, receiving);

    if (error) {
      // Revert
      setLocalStudents(initialStudents);
      setErrorMsg('Failed to update. Please try again.');
      setTimeout(() => setErrorMsg(''), 4000);
    }

    setPending((p) => {
      const next = new Set(p);
      next.delete(pendingKey);
      return next;
    });
  }

  function handleStudentAdded() {
    setShowAddStudent(false);
    startTransition(() => router.refresh());
  }

  function handleBookAdded() {
    setShowAddBook(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-3 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Table header row with group name + buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-300">{classGroupName}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddBook(true)}
              className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              + Add book
            </button>
            <button
              onClick={() => setShowAddStudent(true)}
              className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              + Add student
            </button>
          </div>
        </div>

        {localStudents.length === 0 && books.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No students or books yet. Add some to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                    Balance
                  </th>
                  {books.map((book) => (
                    <th
                      key={book.id}
                      className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      <div>{book.title}</div>
                      <div className="text-zinc-500 normal-case font-normal">
                        ¥{book.price_yen.toLocaleString('ja-JP')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {localStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-100 whitespace-nowrap">
                      {student.name}
                    </td>
                    <BalanceCell
                      balance={student.balance_yen}
                      flash={flashState[student.id] ?? null}
                    />
                    {books.map((book) => {
                      const checked = student.received_book_ids.has(book.id);
                      const pendingKey = `${student.id}:${book.id}`;
                      return (
                        <BookCheckbox
                          key={book.id}
                          checked={checked}
                          disabled={pending.has(pendingKey)}
                          onToggle={() =>
                            handleToggle(student.id, book.id, book.price_yen, checked)
                          }
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddStudentModal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        classGroupId={classGroupId}
        onSuccess={handleStudentAdded}
      />
      <AddBookModal
        isOpen={showAddBook}
        onClose={() => setShowAddBook(false)}
        classGroupId={classGroupId}
        onSuccess={handleBookAdded}
      />
    </>
  );
}
