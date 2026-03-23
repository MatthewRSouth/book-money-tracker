'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Book, ClassGroup, StudentRow } from '@/types';
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
import MoveStudentModal from './MoveStudentModal';
import { toggleBook } from '@/lib/actions/toggle';
import { deleteStudent } from '@/lib/actions/students';
import { deleteBook, moveBook } from '@/lib/actions/books';
import { formatYen } from '@/lib/utils/formatYen';

interface StudentTableProps {
  books: Book[];
  students: StudentRow[];
  classGroupId: string;
  classGroupName: string;
  allGroups: ClassGroup[];
  highlightStudentId?: string;
  onStudentsChange: (students: StudentRow[]) => void;
}

type FlashState = Record<string, 'up' | 'down' | null>;

export default function StudentTable({
  books,
  students: initialStudents,
  classGroupId,
  classGroupName,
  allGroups,
  highlightStudentId,
  onStudentsChange,
}: StudentTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [localStudents, setLocalStudents] = useState<StudentRow[]>(initialStudents);

  // Keep a ref to the latest callback so the effect below never goes stale.
  const onStudentsChangeRef = useRef(onStudentsChange);
  useEffect(() => { onStudentsChangeRef.current = onStudentsChange; });

  // Notify parent whenever local optimistic state changes so the summary bar
  // reflects toggles immediately.
  useEffect(() => {
    onStudentsChangeRef.current(localStudents);
  }, [localStudents]);
  const [flashState, setFlashState] = useState<FlashState>({});
  const [highlightedId, setHighlightedId] = useState<string | undefined>(highlightStudentId);
  const [pending, setPending] = useState<Set<string>>(new Set());
  // Ref-backed set for the guard check so rapid clicks see the current state
  // without relying on the stale closure value of `pending`.
  const pendingKeys = useRef(new Set<string>());
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const flashTimeoutsRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all pending timeouts when the component unmounts
  useEffect(() => () => {
    flashTimeoutsRef.current.forEach(clearTimeout);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setErrorMsg(''), 4000);
  }, []);

  // Student edit/delete/payment/move state
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);
  const [payingStudent, setPayingStudent] = useState<StudentRow | null>(null);
  const [movingStudent, setMovingStudent] = useState<StudentRow | null>(null);
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

    if (pendingKeys.current.has(pendingKey)) return;
    pendingKeys.current.add(pendingKey);
    setPending(new Set(pendingKeys.current));
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
    const tid = setTimeout(() => {
      setFlashState((f) => ({ ...f, [studentId]: null }));
      flashTimeoutsRef.current.delete(tid);
    }, 700);
    flashTimeoutsRef.current.add(tid);

    const { error } = await toggleBook(studentId, bookId, receiving);

    if (error) {
      setLocalStudents(initialStudents);
      showError('Failed to update. Please try again.');
    }

    pendingKeys.current.delete(pendingKey);
    setPending(new Set(pendingKeys.current));
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
      showError('Failed to delete student. Please try again.');
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
      showError('Failed to reorder book. Please try again.');
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
      showError('Failed to delete book. Please try again.');
    }
    setDeletingBook(null);
    refresh();
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header row with group name + buttons */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground min-w-0 truncate mr-auto">{classGroupName}</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
            <DropdownMenu
              trigger={<span className="hidden sm:flex items-center px-3 min-h-11 text-sm border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors cursor-pointer whitespace-nowrap">Export ▾</span>}
              items={[
                { label: 'CSV', onClick: handleExportCSV },
                { label: 'Excel (.xlsx)', onClick: handleExportXLSX },
              ]}
            />
            <button
              onClick={() => setShowImport(true)}
              className="hidden sm:flex items-center px-3 min-h-11 text-sm border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors whitespace-nowrap"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddBook(true)}
              className="flex items-center px-3 min-h-11 text-sm border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors whitespace-nowrap"
            >
              + Add book
            </button>
            <button
              onClick={() => setShowAddStudent(true)}
              className="flex items-center px-3 min-h-11 text-sm border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors whitespace-nowrap"
            >
              + Add student
            </button>
          </div>
        </div>

        {localStudents.length === 0 && books.length === 0 ? (
          <div className="py-12 text-center text-muted text-sm">
            No students or books yet. Add some to get started.
          </div>
        ) : (
          <>
            {/* Mobile card layout — visible below sm */}
            <div className="sm:hidden divide-y divide-border">
              {localStudents.map((student) => {
                const balanceColor = student.balance_yen < 0 ? 'text-red-500' : 'text-green-600';
                return (
                  <div
                    key={student.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(student.id, el);
                      else rowRefs.current.delete(student.id);
                    }}
                    className={`p-4 transition-colors ${highlightedId === student.id ? 'ring-2 ring-inset ring-primary' : ''}`}
                  >
                    {/* Name + menu */}
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="font-semibold text-foreground hover:text-primary text-base transition-colors text-left"
                      >
                        {student.name}
                      </button>
                      <DropdownMenu
                        items={[
                          { label: 'Record payment', onClick: () => setPayingStudent(student) },
                          { label: 'Move to group', onClick: () => setMovingStudent(student) },
                          { label: 'Delete', onClick: () => setDeletingStudent(student), destructive: true },
                        ]}
                      />
                    </div>

                    {student.notes && (
                      <p className="text-xs text-muted italic mb-2">{student.notes}</p>
                    )}

                    {/* Balance */}
                    <div
                      className="flex items-center justify-between py-2.5 border-t border-border cursor-pointer"
                      onClick={() => setHistoryStudent(student)}
                    >
                      <span className="text-sm text-muted">Balance</span>
                      <span className={`font-medium text-sm ${balanceColor}`}>
                        {formatYen(student.balance_yen)}
                      </span>
                    </div>

                    {/* Books */}
                    {books.map((book) => {
                      const checked = student.received_book_ids.has(book.id);
                      const pendingKey = `${student.id}:${book.id}`;
                      return (
                        <div key={book.id} className="flex items-center justify-between py-2.5 border-t border-border">
                          <div className="flex-1 min-w-0 pr-3">
                            <span className="text-sm text-foreground block truncate">{book.title}</span>
                            <span className="text-xs text-muted">¥{book.price_yen.toLocaleString('ja-JP')}</span>
                          </div>
                          <button
                            onClick={() => handleToggle(student.id, book.id, book.price_yen, checked)}
                            disabled={pending.has(pendingKey)}
                            aria-checked={checked}
                            role="checkbox"
                            className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                              checked ? 'bg-primary border-primary' : 'bg-transparent border-border hover:border-primary'
                            }`}
                          >
                            {checked && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Desktop table layout — visible on sm+ */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/70">
                    <th className="sticky left-0 z-20 bg-card w-36 min-w-36 px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap border-r border-border">
                      Student
                    </th>
                    <th className="sticky left-36 z-20 bg-card w-24 min-w-24 px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap border-r border-border">
                      Balance
                    </th>
                    {books.map((book, bookIndex) => (
                      <th
                        key={book.id}
                        className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap relative"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveBook(book.id, 'up')}
                              disabled={bookIndex === 0 || !!movingBookId}
                              className="p-0.5 text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move book left"
                            >
                              ◀
                            </button>
                            <span>{book.title}</span>
                            <button
                              onClick={() => handleMoveBook(book.id, 'down')}
                              disabled={bookIndex === books.length - 1 || !!movingBookId}
                              className="p-0.5 text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move book right"
                            >
                              ▶
                            </button>
                            <button
                              onClick={() => setBulkBook(book)}
                              className="p-0.5 text-muted hover:text-primary transition-colors"
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
                          <div className="text-muted normal-case font-normal">
                            ¥{book.price_yen.toLocaleString('ja-JP')}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {localStudents.map((student) => (
                    <React.Fragment key={student.id}>
                      <tr
                        ref={(el) => {
                          if (el) rowRefs.current.set(student.id, el);
                          else rowRefs.current.delete(student.id);
                        }}
                        className={`hover:bg-background transition-colors ${highlightedId === student.id ? 'ring-2 ring-inset ring-primary' : ''}`}
                      >
                        <td className="sticky left-0 z-10 bg-card w-36 min-w-36 px-4 py-3 font-medium text-foreground whitespace-nowrap border-r border-border">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="hover:text-primary hover:underline text-left transition-colors"
                            >
                              {student.name}
                            </button>
                            <DropdownMenu
                              items={[
                                { label: 'Record payment', onClick: () => setPayingStudent(student) },
                                { label: 'Move to group', onClick: () => setMovingStudent(student) },
                                { label: 'Delete', onClick: () => setDeletingStudent(student), destructive: true },
                              ]}
                            />
                          </div>
                        </td>
                        <BalanceCell
                          balance={student.balance_yen}
                          flash={flashState[student.id] ?? null}
                          onClick={() => setHistoryStudent(student)}
                          className="sticky left-36 z-10 bg-card w-24 min-w-24 border-r border-border"
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
                          <td colSpan={2 + books.length} className="px-4 pb-2 text-xs text-muted italic">
                            {student.notes}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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

      {movingStudent && (
        <MoveStudentModal
          isOpen={true}
          onClose={() => setMovingStudent(null)}
          student={movingStudent}
          currentGroupId={classGroupId}
          allGroups={allGroups}
          onSuccess={() => { setMovingStudent(null); refresh(); }}
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
