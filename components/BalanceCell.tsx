'use client';

import { formatYen } from '@/lib/utils/formatYen';

interface BalanceCellProps {
  balance: number;
  flash: 'up' | 'down' | null;
  onClick?: () => void;
  className?: string;
}

export default function BalanceCell({ balance, flash, onClick, className }: BalanceCellProps) {
  const colorClass = balance < 0 ? 'text-red-500' : 'text-green-600';
  const animClass =
    flash === 'up'
      ? 'animate-[flash-up_0.6s_ease-out]'
      : flash === 'down'
      ? 'animate-[flash-down_0.6s_ease-out]'
      : '';

  return (
    <td
      className={`px-4 py-3 whitespace-nowrap${onClick ? ' cursor-pointer' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span
        key={flash ? `${balance}-${flash}` : balance}
        className={`inline-block px-2 py-0.5 rounded font-medium text-sm ${colorClass} ${animClass}`}
      >
        {formatYen(balance)}
      </span>
    </td>
  );
}
