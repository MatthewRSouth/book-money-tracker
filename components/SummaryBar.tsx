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
    <>
      {/* Mobile: compact label + value rows */}
      <div className="sm:hidden divide-y divide-border/50 py-2 mb-4">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-muted uppercase tracking-wide">Students</span>
          <span className="text-sm font-semibold text-foreground">{studentCount}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-muted uppercase tracking-wide">Total balance</span>
          <span className={`text-sm font-semibold ${totalBalance < 0 ? 'text-red-500' : 'text-foreground'}`}>
            {formatYen(totalBalance)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-muted uppercase tracking-wide">Fully paid out</span>
          <span className="text-sm font-semibold text-foreground">{fullyPaidOut} / {studentCount}</span>
        </div>
      </div>

      {/* Desktop: large stats side by side */}
      <div className="hidden sm:flex gap-8 py-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Students</p>
          <p className="text-2xl font-semibold text-foreground mt-0.5">{studentCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Total balance</p>
          <p className={`text-2xl font-semibold mt-0.5 ${totalBalance < 0 ? 'text-red-500' : 'text-foreground'}`}>
            {formatYen(totalBalance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Fully paid out</p>
          <p className="text-2xl font-semibold text-foreground mt-0.5">
            {fullyPaidOut} / {studentCount}
          </p>
        </div>
      </div>
    </>
  );
}
