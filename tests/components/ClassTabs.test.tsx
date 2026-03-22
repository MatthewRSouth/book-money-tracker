import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassTabs from '@/components/ClassTabs';
import type { ClassGroup } from '@/types';

const groups: ClassGroup[] = [
  { id: 'g1', name: 'Class A', sort_order: 1 },
  { id: 'g2', name: 'Class B', sort_order: 2 },
  { id: 'g3', name: 'Class C', sort_order: 3 },
];

function setup(activeGroupId = 'g1', onTabClick = vi.fn()) {
  const user = userEvent.setup();
  render(
    <ClassTabs groups={groups} activeGroupId={activeGroupId} onTabClick={onTabClick} />
  );
  return { user, onTabClick };
}

describe('ClassTabs', () => {
  it('renders a button for every group', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Class A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Class B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Class C' })).toBeInTheDocument();
  });

  it('applies active styling to the active tab', () => {
    setup('g2');
    expect(screen.getByRole('button', { name: 'Class B' })).toHaveClass('bg-primary');
  });

  it('does not apply active styling to inactive tabs', () => {
    setup('g1');
    expect(screen.getByRole('button', { name: 'Class B' })).not.toHaveClass('bg-primary');
    expect(screen.getByRole('button', { name: 'Class C' })).not.toHaveClass('bg-primary');
  });

  it('calls onTabClick with the correct group id when a tab is clicked', async () => {
    const { user, onTabClick } = setup('g1');
    await user.click(screen.getByRole('button', { name: 'Class B' }));
    expect(onTabClick).toHaveBeenCalledOnce();
    expect(onTabClick).toHaveBeenCalledWith('g2');
  });

  it('calls onTabClick even when clicking the already-active tab', async () => {
    const { user, onTabClick } = setup('g1');
    await user.click(screen.getByRole('button', { name: 'Class A' }));
    expect(onTabClick).toHaveBeenCalledWith('g1');
  });

  it('renders with a single group', () => {
    const user = userEvent.setup();
    const onTabClick = vi.fn();
    render(
      <ClassTabs
        groups={[{ id: 'solo', name: 'Solo', sort_order: 1 }]}
        activeGroupId="solo"
        onTabClick={onTabClick}
      />
    );
    expect(screen.getByRole('button', { name: 'Solo' })).toHaveClass('bg-primary');
  });
});
