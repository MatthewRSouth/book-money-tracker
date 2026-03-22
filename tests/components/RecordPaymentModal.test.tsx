import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordPaymentModal from '@/components/RecordPaymentModal';
import type { StudentRow } from '@/types';

const mockRecordPayment = vi.fn();
vi.mock('@/lib/actions/payments', () => ({
  recordPayment: (...args: unknown[]) => mockRecordPayment(...args),
}));

const mockStudent: StudentRow = {
  id: 'student-1',
  class_group_id: 'group-1',
  name: 'Alice',
  balance_yen: 15000,
  notes: null,
  received_book_ids: new Set(),
};

function setup(props: Partial<React.ComponentProps<typeof RecordPaymentModal>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    student: mockStudent,
    onSuccess: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  const user = userEvent.setup();
  render(<RecordPaymentModal {...merged} />);
  return { user, ...merged };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecordPaymentModal', () => {
  it('renders the student name in title', () => {
    setup();
    expect(screen.getByText(/Record payment — Alice/)).toBeInTheDocument();
  });

  it('date input defaults to today', () => {
    setup();
    const today = new Date().toISOString().split('T')[0];
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();
  });

  it('validates positive amount — rejects 0', async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText('e.g. 5000'), '0');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(screen.getByText(/at least ¥1/)).toBeInTheDocument();
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('calls recordPayment with correct args on submit', async () => {
    mockRecordPayment.mockResolvedValueOnce({ error: null });
    const onSuccess = vi.fn();
    const { user } = setup({ onSuccess });
    await user.type(screen.getByPlaceholderText('e.g. 5000'), '5000');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(mockRecordPayment).toHaveBeenCalledWith(
      'student-1',
      5000,
      null,
      expect.any(String)
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('converts empty note to null', async () => {
    mockRecordPayment.mockResolvedValueOnce({ error: null });
    const { user } = setup();
    await user.type(screen.getByPlaceholderText('e.g. 5000'), '1000');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.any(String),
      1000,
      null,
      expect.any(String)
    );
  });
});
