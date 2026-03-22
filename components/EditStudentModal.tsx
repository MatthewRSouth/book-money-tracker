'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { updateStudent } from '@/lib/actions/students';
import type { StudentRow } from '@/types';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRow;
  onSuccess: () => void;
}

export default function EditStudentModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: EditStudentModalProps) {
  const [name, setName] = useState(student.name);
  const [balance, setBalance] = useState(String(student.balance_yen));
  const [notes, setNotes] = useState(student.notes ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setName(student.name);
    setBalance(String(student.balance_yen));
    setNotes(student.notes ?? '');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const parsedBalance = parseInt(balance, 10);
    if (isNaN(parsedBalance)) {
      setError('Balance must be a number.');
      return;
    }

    setLoading(true);
    const { error: err } = await updateStudent(
      student.id,
      name.trim(),
      parsedBalance,
      notes.trim() || null
    );
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit student">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Balance (¥)</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            Directly sets the balance without recording a payment. Use &quot;Record payment&quot; for incoming money.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm resize-none"
            placeholder="Optional notes about this student"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm border border-border rounded-lg text-muted hover:bg-background transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
