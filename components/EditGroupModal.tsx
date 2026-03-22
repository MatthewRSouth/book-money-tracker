'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { updateGroup } from '@/lib/actions/groups';
import type { ClassGroup } from '@/types';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ClassGroup;
  onSuccess: () => void;
}

export default function EditGroupModal({
  isOpen,
  onClose,
  group,
  onSuccess,
}: EditGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setName(group.name);
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    setLoading(true);
    const { error: err } = await updateGroup(group.id, name.trim());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rename group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 text-sm"
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
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
