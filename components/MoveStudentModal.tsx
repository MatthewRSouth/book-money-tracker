'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { moveStudentToGroup } from '@/lib/actions/students';
import type { ClassGroup, StudentRow } from '@/types';

interface MoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRow;
  currentGroupId: string;
  allGroups: ClassGroup[];
  onSuccess: () => void;
}

export default function MoveStudentModal({
  isOpen,
  onClose,
  student,
  currentGroupId,
  allGroups,
  onSuccess,
}: MoveStudentModalProps) {
  const otherGroups = allGroups.filter((g) => g.id !== currentGroupId);
  const [selectedGroupId, setSelectedGroupId] = useState(otherGroups[0]?.id ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setSelectedGroupId(otherGroups[0]?.id ?? '');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId) return;
    setError('');
    setLoading(true);
    const { error: err } = await moveStudentToGroup(student.id, selectedGroupId);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  }

  const destinationName = allGroups.find((g) => g.id === selectedGroupId)?.name ?? '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Move ${student.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Select a group to move this student to. Their balance, notes, and payment
          history will carry over. Book checkmarks from this group will be kept as a
          record but won&apos;t display in the new group.
        </p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Destination group
          </label>
          {otherGroups.length === 0 ? (
            <p className="text-sm text-muted">No other groups exist.</p>
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              autoFocus
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-sm"
            >
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
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
            disabled={loading || otherGroups.length === 0}
            className="flex-1 px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Moving…' : `Move to ${destinationName}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
