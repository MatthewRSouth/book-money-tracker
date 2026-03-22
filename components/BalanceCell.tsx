'use client';

import { useEffect, useState } from 'react';
import { formatYen } from '@/lib/utils/formatYen';

interface BalanceCellProps {
  balance: number;
  flash: 'up' | 'down' | null;
  onClick?: () => void;
}

export default function BalanceCell({ balance, flash, onClick }: BalanceCellProps) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (flash) {
      setAnimKey((k) => k + 1);
    }
  }, [flash]);

  const colorClass = balance < 0 ? 'text-red-400' : 'text-green-400';
  const animClass =
    flash === 'up'
      ? 'animate-[flash-up_0.6s_ease-out]'
      : flash === 'down'
      ? 'animate-[flash-down_0.6s_ease-out]'
      : '';

  return (
    <td
      className={`px-4 py-3 whitespace-nowrap${onClick ? ' cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span
        key={animKey}
        className={`inline-block px-2 py-0.5 rounded font-medium text-sm ${colorClass} ${animClass}`}
      >
        {formatYen(balance)}
      </span>
    </td>
  );
}
