'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import { updateBook } from '@/lib/actions/books';
import type { Book } from '@/types';

interface EditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  onSuccess: () => void;
}

export default function EditBookModal({
  isOpen,
  onClose,
  book,
  onSuccess,
}: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [price, setPrice] = useState(String(book.price_yen));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setTitle(book.title);
    setPrice(String(book.price_yen));
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price must be 0 or more.');
      return;
    }

    setLoading(true);
    const { error: err } = await updateBook(book.id, title.trim(), parsedPrice);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit book">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Price (¥)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={0}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted focus:outline-none focus:border-primary text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            Changing the price will retroactively adjust balances for students who already received this book.
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
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
