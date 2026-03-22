import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Delete item',
    message: 'Are you sure?',
    confirmLabel: 'Delete',
    onConfirm: vi.fn(),
    loading: false,
  };
  const merged = { ...defaults, ...props };
  const user = userEvent.setup();
  render(<ConfirmDialog {...merged} />);
  return { user, ...merged };
}

describe('ConfirmDialog', () => {
  it('renders the message', () => {
    setup();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders the confirm label', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    const { user } = setup({ onClose });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows loading state and disables buttons', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('does not render when isOpen=false', () => {
    setup({ isOpen: false });
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });
});
