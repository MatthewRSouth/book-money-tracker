'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ClassGroup } from '@/types';
import AddGroupModal from './AddGroupModal';
import EditGroupModal from './EditGroupModal';
import ConfirmDialog from './ui/ConfirmDialog';
import { deleteGroup } from '@/lib/actions/groups';

interface ManageGroupsTableProps {
  groups: ClassGroup[];
  studentCounts: Record<string, number>;
}

export default function ManageGroupsTable({ groups, studentCounts }: ManageGroupsTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<ClassGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!deletingGroup) return;
    setDeleteLoading(true);
    const { error } = await deleteGroup(deletingGroup.id);
    setDeleteLoading(false);
    setDeletingGroup(null);
    if (error) {
      setErrorMsg(
        error.includes('has students')
          ? 'Cannot delete a group that has students. Remove all students first.'
          : error
      );
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      refresh();
    }
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
        {groups.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No groups yet. Add one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Students
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-100">{group.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{studentCounts[group.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="px-3 py-1 text-xs border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => setDeletingGroup(group)}
                        className="px-3 py-1 text-xs border border-red-900 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
      >
        + Add group
      </button>

      <AddGroupModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); refresh(); }}
      />

      {editingGroup && (
        <EditGroupModal
          isOpen={true}
          onClose={() => setEditingGroup(null)}
          group={editingGroup}
          onSuccess={() => { setEditingGroup(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        title="Delete group"
        message={`Delete "${deletingGroup?.name ?? 'this group'}"? This cannot be undone. Groups with students cannot be deleted.`}
        confirmLabel="Delete group"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  );
}
