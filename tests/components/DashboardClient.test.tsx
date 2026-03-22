import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardClient from '@/components/DashboardClient';
import type { GroupData } from '@/types';

// DashboardClient renders StudentTable which uses useRouter for refresh() calls.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

// Stub out server actions imported by StudentTable
vi.mock('@/lib/actions/toggle', () => ({ toggleBook: vi.fn() }));
vi.mock('@/lib/actions/students', () => ({ deleteStudent: vi.fn() }));
vi.mock('@/lib/actions/books', () => ({ deleteBook: vi.fn(), moveBook: vi.fn() }));

const makeGroup = (id: string, name: string): GroupData => ({
  group: { id, name, sort_order: 1 },
  books: [
    { id: `${id}-book1`, class_group_id: id, title: `Book 1 of ${name}`, price_yen: 1000, sort_order: 1 },
  ],
  students: [
    {
      id: `${id}-s1`,
      class_group_id: id,
      name: `Student of ${name}`,
      balance_yen: 500,
      notes: null,
      received_book_ids: new Set(),
    },
  ],
});

const groupA = makeGroup('g1', 'Class A');
const groupB = makeGroup('g2', 'Class B');
const allGroupData = [groupA, groupB];

describe('DashboardClient', () => {
  beforeEach(() => {
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  it('renders the initial group\'s student in the table', () => {
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );
    expect(screen.getByText('Student of Class A')).toBeInTheDocument();
  });

  it('renders all group tabs', () => {
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );
    expect(screen.getByRole('button', { name: 'Class A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Class B' })).toBeInTheDocument();
  });

  it('switching tabs shows the new group content immediately', async () => {
    const user = userEvent.setup();
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );

    // Initially shows Class A student
    expect(screen.getByText('Student of Class A')).toBeInTheDocument();

    // Click Class B tab
    await user.click(screen.getByRole('button', { name: 'Class B' }));

    // Class B student appears immediately — no async wait needed (instant state switch)
    expect(screen.getByText('Student of Class B')).toBeInTheDocument();
    expect(screen.queryByText('Student of Class A')).not.toBeInTheDocument();
  });

  it('updates the URL via replaceState when switching tabs', async () => {
    const user = userEvent.setup();
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Class B' }));

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('tab=g2')
    );
  });

  it('active tab changes highlight after click', async () => {
    const user = userEvent.setup();
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );

    const tabB = screen.getByRole('button', { name: 'Class B' });
    expect(tabB).not.toHaveClass('bg-primary');

    await user.click(tabB);
    expect(tabB).toHaveClass('bg-primary');
  });

  it('syncs to a new initialGroupId when props change', () => {
    const { rerender } = render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );

    expect(screen.getByRole('button', { name: 'Class A' })).toHaveClass('bg-primary');

    act(() => {
      rerender(
        <DashboardClient
          allGroupData={allGroupData}
          initialGroupId="g2"
        />
      );
    });

    expect(screen.getByRole('button', { name: 'Class B' })).toHaveClass('bg-primary');
  });

  it('shows student count in summary bar', () => {
    render(
      <DashboardClient
        allGroupData={allGroupData}
        initialGroupId="g1"
      />
    );
    // SummaryBar renders the student count
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
