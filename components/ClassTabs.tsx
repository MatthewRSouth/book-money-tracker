'use client';

import type { ClassGroup } from '@/types';

interface ClassTabsProps {
  groups: ClassGroup[];
  activeGroupId: string;
  onTabClick: (groupId: string) => void;
}

export default function ClassTabs({ groups, activeGroupId, onTabClick }: ClassTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {groups.map((group) => {
        const isActive = group.id === activeGroupId;
        return (
          <button
            key={group.id}
            onClick={() => onTabClick(group.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
  );
}
