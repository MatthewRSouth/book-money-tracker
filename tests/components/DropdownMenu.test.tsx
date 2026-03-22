import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownMenu from '@/components/ui/DropdownMenu';

function setup(items = [
  { label: 'Edit', onClick: vi.fn() },
  { label: 'Delete', onClick: vi.fn(), destructive: true },
]) {
  const user = userEvent.setup();
  const utils = render(<DropdownMenu items={items} />);
  return { user, items, ...utils };
}

describe('DropdownMenu', () => {
  it('renders the trigger button', () => {
    setup();
    expect(screen.getByRole('button', { name: /⋯/ })).toBeInTheDocument();
  });

  it('opens the menu on click', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('closes the menu on Escape key', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on outside click', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls item onClick and closes menu', async () => {
    const editFn = vi.fn();
    const { user } = setup([{ label: 'Edit', onClick: editFn }]);
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    await user.click(screen.getByText('Edit'));
    expect(editFn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('applies destructive styling to destructive items', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    const deleteBtn = screen.getByText('Delete');
    expect(deleteBtn).toHaveClass('text-red-400');
  });

  it('navigates items with Arrow keys', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /⋯/ }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('menuitem')[1]).toHaveFocus();
  });
});
