'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ClassGroup } from '@/types';

interface ClassTabsProps {
  groups: ClassGroup[];
  activeGroupId: string;
}

export default function ClassTabs({ groups, activeGroupId }: ClassTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const displayActiveId = optimisticId ?? activeGroupId;

  function buildUrl(groupId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', groupId);
    return `/dashboard?${params.toString()}`;
  }

  function handleClick(groupId: string) {
    setOptimisticId(groupId);
    startTransition(() => {
      router.push(buildUrl(groupId));
    });
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {groups.map((group) => {
        const isActive = group.id === displayActiveId;
        return (
          <button
            key={group.id}
            onClick={() => handleClick(group.id)}
            onMouseEnter={() => router.prefetch(buildUrl(group.id))}
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
