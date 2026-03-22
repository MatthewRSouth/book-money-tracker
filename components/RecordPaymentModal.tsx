'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { recordPayment } from '@/lib/actions/payments';
import type { StudentRow } from '@/types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRow;
  onSuccess: () => void;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayString);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setAmount('');
    setNote('');
    setDate(todayString());
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      setError('Amount must be at least ¥1.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }

    setLoading(true);
    const { error: err } = await recordPayment(
      student.id,
      parsedAmount,
      note.trim() || null,
      date
    );
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setAmount('');
      setNote('');
      setDate(todayString());
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Record payment — ${student.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Amount (¥)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 text-sm"
            placeholder="e.g. 5000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 text-sm"
            placeholder="e.g. Cash envelope"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-teal-500 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
