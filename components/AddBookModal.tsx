'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { addBook } from '@/lib/actions/books';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroupId: string;
  onSuccess: () => void;
}

export default function AddBookModal({
  isOpen,
  onClose,
  classGroupId,
  onSuccess,
}: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setTitle('');
    setPrice('');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedPrice = parseInt(price, 10);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a non-negative number.');
      return;
    }

    setLoading(true);
    const { error: err } = await addBook(title.trim(), parsedPrice, classGroupId);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setTitle('');
      setPrice('');
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add book">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Book title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
            placeholder="e.g. Oxford Phonics 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Price (¥)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={0}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
            placeholder="e.g. 2000"
          />
          <p className="mt-1 text-xs text-muted">
            This will be deducted from balance when checked
          </p>
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
            {loading ? 'Adding…' : 'Add book'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
