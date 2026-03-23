'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GroupData, StudentRow } from '@/types';
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

  // Mirror of each group's optimistic student list, kept in sync by StudentTable
  // via onStudentsChange. This lets the summary bar reflect toggles instantly.
  const [localStudentsMap, setLocalStudentsMap] = useState<Record<string, StudentRow[]>>(
    () => Object.fromEntries(allGroupData.map((gd) => [gd.group.id, gd.students]))
  );

  // When the server re-renders (e.g. after router.refresh()), reset everything.
  useEffect(() => {
    setActiveGroupId(initialGroupId);
    setLocalStudentsMap(Object.fromEntries(allGroupData.map((gd) => [gd.group.id, gd.students])));
  }, [initialGroupId, allGroupData]);

  const groups = useMemo(() => allGroupData.map((gd) => gd.group), [allGroupData]);
  const activeData =
    allGroupData.find((gd) => gd.group.id === activeGroupId) ?? allGroupData[0];

  const { group: activeGroup, books } = activeData;

  // Use optimistic local students for the summary so it reflects toggles immediately.
  const summaryStudents = localStudentsMap[activeGroupId] ?? activeData.students;
  const { totalBalance, fullyPaidOut } = useMemo(() => ({
    totalBalance: summaryStudents.reduce((sum, s) => sum + s.balance_yen, 0),
    fullyPaidOut: books.length > 0
      ? summaryStudents.filter((s) => books.every((b) => s.received_book_ids.has(b.id))).length
      : 0,
  }), [summaryStudents, books]);

  function handleTabClick(groupId: string) {
    setActiveGroupId(groupId);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', groupId);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  const handleStudentsChange = useCallback((updated: StudentRow[]) => {
    setLocalStudentsMap((prev) => ({ ...prev, [activeGroupId]: updated }));
  }, [activeGroupId]);

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
        studentCount={summaryStudents.length}
        totalBalance={totalBalance}
        fullyPaidOut={fullyPaidOut}
      />

      <StudentTable
        books={books}
        students={activeData.students}
        classGroupId={activeGroup.id}
        classGroupName={activeGroup.name}
        allGroups={groups}
        highlightStudentId={highlightStudentId}
        onStudentsChange={handleStudentsChange}
      />
    </>
  );
}
