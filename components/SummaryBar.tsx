import { formatYen } from '@/lib/utils/formatYen';

interface SummaryBarProps {
  studentCount: number;
  totalBalance: number;
  fullyPaidOut: number;
}

export default function SummaryBar({
  studentCount,
  totalBalance,
  fullyPaidOut,
}: SummaryBarProps) {
  return (
    <div className="flex gap-8 py-4">
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Students</p>
        <p className="text-2xl font-semibold text-zinc-100 mt-0.5">{studentCount}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Total balance</p>
        <p className={`text-2xl font-semibold mt-0.5 ${totalBalance < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
          {formatYen(totalBalance)}
        </p>
      </div>
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide">Fully paid out</p>
        <p className="text-2xl font-semibold text-zinc-100 mt-0.5">
          {fullyPaidOut} / {studentCount}
        </p>
      </div>
    </div>
  );
}
