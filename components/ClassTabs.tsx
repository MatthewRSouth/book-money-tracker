'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ClassGroup } from '@/types';

interface ClassTabsProps {
  groups: ClassGroup[];
  activeGroupId: string;
}

export default function ClassTabs({ groups, activeGroupId }: ClassTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick(groupId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', groupId);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {groups.map((group) => {
        const isActive = group.id === activeGroupId;
        return (
          <button
            key={group.id}
            onClick={() => handleClick(group.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {group.name}
          </button>
        );
      })}
    </div>
  );
}
