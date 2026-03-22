'use client';

import { useState, useEffect } from 'react';
import type { GroupData } from '@/types';
import ClassTabs from '@/components/ClassTabs';
import SummaryBar from '@/components/SummaryBar';
import StudentTable from '@/components/StudentTable';

interface DashboardClientProps {
  allGroupData: GroupData[];
  initialGroupId: string;
  highlightStudentId?: string;
}

export default function DashboardClient({
  allGroupData,
  initialGroupId,
  highlightStudentId,
}: DashboardClientProps) {
  const [activeGroupId, setActiveGroupId] = useState(initialGroupId);

  // When the server re-renders (e.g. after router.refresh()), sync to whatever
  // tab the server thinks is active (which matches the current URL).
  useEffect(() => {
    setActiveGroupId(initialGroupId);
  }, [initialGroupId]);

  const groups = allGroupData.map((gd) => gd.group);
  const activeData =
    allGroupData.find((gd) => gd.group.id === activeGroupId) ?? allGroupData[0];

  const { group: activeGroup, books, students } = activeData;

  const totalBalance = students.reduce((sum, s) => sum + s.balance_yen, 0);
  const fullyPaidOut = students.filter(
    (s) => books.length > 0 && books.every((b) => s.received_book_ids.has(b.id))
  ).length;

  function handleTabClick(groupId: string) {
    setActiveGroupId(groupId);
    // Shallow-update the URL without triggering a server navigation so the
    // current tab survives a page refresh or router.refresh().
    const params = new URLSearchParams(window.location.search);
    params.set('tab', groupId);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-6 sm:mx-0 mx-8">
        <ClassTabs
          groups={groups}
          activeGroupId={activeGroupId}
          onTabClick={handleTabClick}
        />
      </div>

      <SummaryBar
        studentCount={students.length}
        totalBalance={totalBalance}
        fullyPaidOut={fullyPaidOut}
      />

      <StudentTable
        books={books}
        students={students}
        classGroupId={activeGroup.id}
        classGroupName={activeGroup.name}
        highlightStudentId={highlightStudentId}
      />
    </>
  );
}
