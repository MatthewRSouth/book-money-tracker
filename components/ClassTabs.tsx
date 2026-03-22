'use client';

import type { ClassGroup } from '@/types';

interface ClassTabsProps {
  groups: ClassGroup[];
  activeGroupId: string;
  onTabClick: (groupId: string) => void;
}

export default function ClassTabs({ groups, activeGroupId, onTabClick }: ClassTabsProps) {
  return (
    <>
      {/* Mobile: native select dropdown */}
      <div className="sm:hidden">
        <select
          value={activeGroupId}
          onChange={(e) => onTabClick(e.target.value)}
          className="w-full min-h-11 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:border-primary appearance-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          aria-label="Select class group"
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: tab pills */}
      <div className="hidden sm:flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
        {groups.map((group) => {
          const isActive = group.id === activeGroupId;
          return (
            <button
              key={group.id}
              onClick={() => onTabClick(group.id)}
              className={`shrink-0 px-4 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground hover:bg-border'
              }`}
            >
              {group.name}
            </button>
          );
        })}
      </div>
    </>
  );
}
