'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { addStudent } from '@/lib/actions/students';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroupId: string;
  onSuccess: () => void;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  classGroupId,
  onSuccess,
}: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('20000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setName('');
    setBalance('20000');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedBalance = parseInt(balance, 10);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (isNaN(parsedBalance)) {
      setError('Balance must be a number.');
      return;
    }

    setLoading(true);
    const { error: err } = await addStudent(name.trim(), parsedBalance, classGroupId);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setName('');
      setBalance('20000');
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add student">
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
            placeholder="Student name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Starting balance (¥)
          </label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
            placeholder="20000"
          />
          <p className="mt-1 text-xs text-muted">Defaults to ¥20,000 if left blank</p>
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
            {loading ? 'Adding…' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
