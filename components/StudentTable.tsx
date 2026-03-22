'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, StudentRow } from '@/types';
import BookCheckbox from './BookCheckbox';
import BalanceCell from './BalanceCell';
import AddStudentModal from './AddStudentModal';
import AddBookModal from './AddBookModal';
import EditStudentModal from './EditStudentModal';
import EditBookModal from './EditBookModal';
import RecordPaymentModal from './RecordPaymentModal';
import DropdownMenu from './ui/DropdownMenu';
import ConfirmDialog from './ui/ConfirmDialog';
import StudentHistoryModal from './StudentHistoryModal';
import ImportStudentsModal from './ImportStudentsModal';
import BulkReceiveModal from './BulkReceiveModal';
import { toggleBook } from '@/lib/actions/toggle';
import { deleteStudent } from '@/lib/actions/students';
import { deleteBook, moveBook } from '@/lib/actions/books';

interface StudentTableProps {
  books: Book[];
  students: StudentRow[];
  classGroupId: string;
  classGroupName: string;
  highlightStudentId?: string;
}

type FlashState = Record<string, 'up' | 'down' | null>;

export default function StudentTable({
  books,
  students: initialStudents,
  classGroupId,
  classGroupName,
  highlightStudentId,
}: StudentTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [localStudents, setLocalStudents] = useState<StudentRow[]>(initialStudents);
  const [flashState, setFlashState] = useState<FlashState>({});
  const [highlightedId, setHighlightedId] = useState<string | undefined>(highlightStudentId);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Student edit/delete/payment state
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);
  const [payingStudent, setPayingStudent] = useState<StudentRow | null>(null);
  const [deleteStudentLoading, setDeleteStudentLoading] = useState(false);

  // Book edit/delete/reorder state
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [deleteBookLoading, setDeleteBookLoading] = useState(false);
  const [movingBookId, setMovingBookId] = useState<string | null>(null);

  // Bulk receive state
  const [bulkBook, setBulkBook] = useState<Book | null>(null);

  // History modal state
  const [historyStudent, setHistoryStudent] = useState<StudentRow | null>(null);

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setLocalStudents(initialStudents);
  }, [initialStudents]);

  // Highlight + scroll when highlightStudentId changes
  useEffect(() => {
    if (!highlightStudentId) return;
    setHighlightedId(highlightStudentId);
    const row = rowRefs.current.get(highlightStudentId);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(() => setHighlightedId(undefined), 2000);
    return () => clearTimeout(timer);
  }, [highlightStudentId]);

  async function handleToggle(studentId: string, bookId: string, bookPrice: number, currentlyChecked: boolean) {
    const receiving = !currentlyChecked;
    const pendingKey = `${studentId}:${bookId}`;

    if (pending.has(pendingKey)) return;

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

  function refresh() {
    startTransition(() => router.refresh());
  }

  function buildExportData() {
    const today = new Date().toISOString().slice(0, 10);
    const bookTitles = books.map((b) => b.title);
    const header = ['Name', 'Balance (¥)', 'Notes', ...bookTitles];
    const rows = localStudents.map((s) => [
      s.name,
      s.balance_yen,
      s.notes ?? '',
      ...books.map((b) => (s.received_book_ids.has(b.id) ? '✓' : '')),
    ]);
    return { header, rows, filename: `${classGroupName}-${today}` };
  }

  function handleExportCSV() {
    const { header, rows, filename } = buildExportData();
    const all = [header, ...rows];
    const csv = all
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportXLSX() {
    const { header, rows, filename } = buildExportData();
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, classGroupName.slice(0, 31));
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async function handleDeleteStudent() {
    if (!deletingStudent) return;
    setDeleteStudentLoading(true);
    const { error } = await deleteStudent(deletingStudent.id);
    setDeleteStudentLoading(false);
    if (error) {
      setErrorMsg('Failed to delete student. Please try again.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
    setDeletingStudent(null);
    refresh();
  }

  async function handleMoveBook(bookId: string, direction: 'up' | 'down') {
    if (movingBookId) return;
    setMovingBookId(bookId);
    const { error } = await moveBook(bookId, direction, classGroupId);
    setMovingBookId(null);
    if (error) {
      setErrorMsg('Failed to reorder book. Please try again.');
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      refresh();
    }
  }

  async function handleDeleteBook() {
    if (!deletingBook) return;
    setDeleteBookLoading(true);
    const { error } = await deleteBook(deletingBook.id);
    setDeleteBookLoading(false);
    if (error) {
      setErrorMsg('Failed to delete book. Please try again.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
    setDeletingBook(null);
    refresh();
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
            <DropdownMenu
              trigger={<span className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer">Export ▾</span>}
              items={[
                { label: 'CSV', onClick: handleExportCSV },
                { label: 'Excel (.xlsx)', onClick: handleExportXLSX },
              ]}
            />
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              Import
            </button>
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
                  {books.map((book, bookIndex) => (
                    <th
                      key={book.id}
                      className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap relative"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveBook(book.id, 'up')}
                            disabled={bookIndex === 0 || !!movingBookId}
                            className="p-0.5 text-zinc-500 hover:text-teal-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move book left"
                          >
                            ◀
                          </button>
                          <span>{book.title}</span>
                          <button
                            onClick={() => handleMoveBook(book.id, 'down')}
                            disabled={bookIndex === books.length - 1 || !!movingBookId}
                            className="p-0.5 text-zinc-500 hover:text-teal-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move book right"
                          >
                            ▶
                          </button>
                          <button
                            onClick={() => setBulkBook(book)}
                            className="p-0.5 text-zinc-500 hover:text-teal-300 transition-colors"
                            title="Distribute to all"
                            aria-label="Distribute book to all students"
                          >
                            ⬇
                          </button>
                          <DropdownMenu
                            items={[
                              { label: 'Edit book', onClick: () => setEditingBook(book) },
                              { label: 'Delete book', onClick: () => setDeletingBook(book), destructive: true },
                            ]}
                          />
                        </div>
                        <div className="text-zinc-500 normal-case font-normal">
                          ¥{book.price_yen.toLocaleString('ja-JP')}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {localStudents.map((student) => (
                  <React.Fragment key={student.id}>
                    <tr
                      ref={(el) => {
                        if (el) rowRefs.current.set(student.id, el);
                        else rowRefs.current.delete(student.id);
                      }}
                      className={`hover:bg-zinc-800/30 transition-colors ${highlightedId === student.id ? 'ring-2 ring-inset ring-teal-400' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="hover:text-teal-300 hover:underline text-left transition-colors"
                          >
                            {student.name}
                          </button>
                          <DropdownMenu
                            items={[
                              { label: 'Record payment', onClick: () => setPayingStudent(student) },
                              { label: 'Delete', onClick: () => setDeletingStudent(student), destructive: true },
                            ]}
                          />
                        </div>
                      </td>
                      <BalanceCell
                        balance={student.balance_yen}
                        flash={flashState[student.id] ?? null}
                        onClick={() => setHistoryStudent(student)}
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
                    {student.notes && (
                      <tr>
                        <td colSpan={2 + books.length} className="px-4 pb-2 text-xs text-zinc-500 italic">
                          {student.notes}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        onSuccess={() => { setShowAddStudent(false); refresh(); }}
      />
      <AddBookModal
        isOpen={showAddBook}
        onClose={() => setShowAddBook(false)}
        classGroupId={classGroupId}
        onSuccess={() => { setShowAddBook(false); refresh(); }}
      />
      <ImportStudentsModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        classGroupId={classGroupId}
        classGroupName={classGroupName}
        onSuccess={() => { setShowImport(false); refresh(); }}
      />
      {bulkBook && (
        <BulkReceiveModal
          isOpen={true}
          onClose={() => setBulkBook(null)}
          book={bulkBook}
          classGroupId={classGroupId}
          students={localStudents}
          onSuccess={(bookId, priceYen) => {
            setLocalStudents((prev) =>
              prev.map((s) => {
                if (s.received_book_ids.has(bookId)) return s;
                const newIds = new Set(s.received_book_ids);
                newIds.add(bookId);
                return { ...s, received_book_ids: newIds, balance_yen: s.balance_yen - priceYen };
              })
            );
            setBulkBook(null);
            refresh();
          }}
        />
      )}

      {historyStudent && (
        <StudentHistoryModal
          isOpen={true}
          onClose={() => setHistoryStudent(null)}
          student={historyStudent}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          isOpen={true}
          onClose={() => setEditingStudent(null)}
          student={editingStudent}
          onSuccess={() => { setEditingStudent(null); refresh(); }}
        />
      )}

      {payingStudent && (
        <RecordPaymentModal
          isOpen={true}
          onClose={() => setPayingStudent(null)}
          student={payingStudent}
          onSuccess={() => { setPayingStudent(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingStudent}
        onClose={() => setDeletingStudent(null)}
        title="Delete student"
        message={`Are you sure you want to delete ${deletingStudent?.name ?? 'this student'}? This cannot be undone.`}
        confirmLabel="Delete student"
        onConfirm={handleDeleteStudent}
        loading={deleteStudentLoading}
      />

      {editingBook && (
        <EditBookModal
          isOpen={true}
          onClose={() => setEditingBook(null)}
          book={editingBook}
          onSuccess={() => { setEditingBook(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingBook}
        onClose={() => setDeletingBook(null)}
        title="Delete book"
        message={`Are you sure you want to delete "${deletingBook?.title ?? 'this book'}"? Student balances will be restored.`}
        confirmLabel="Delete book"
        onConfirm={handleDeleteBook}
        loading={deleteBookLoading}
      />
    </>
  );
}
