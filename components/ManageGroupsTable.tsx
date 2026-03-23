'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ClassGroup } from '@/types';
import AddGroupModal from './AddGroupModal';
import EditGroupModal from './EditGroupModal';
import ConfirmDialog from './ui/ConfirmDialog';
import { deleteGroup, reorderGroups } from '@/lib/actions/groups';

interface ManageGroupsTableProps {
  groups: ClassGroup[];
  studentCounts: Record<string, number>;
}

function GripHandle(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      aria-label="Drag to reorder"
      className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground p-1 touch-none shrink-0"
    >
      <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden>
        <circle cx="3" cy="3"  r="1.5" />
        <circle cx="3" cy="9"  r="1.5" />
        <circle cx="3" cy="15" r="1.5" />
        <circle cx="9" cy="3"  r="1.5" />
        <circle cx="9" cy="9"  r="1.5" />
        <circle cx="9" cy="15" r="1.5" />
      </svg>
    </button>
  );
}

interface RowProps {
  group: ClassGroup;
  studentCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableGroupCard({ group, studentCount, onEdit, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`px-4 py-3 transition-opacity ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <GripHandle {...attributes} {...listeners} />
        <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{group.name}</p>
            <p className="text-xs text-muted mt-0.5">{studentCount} students</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="px-3 min-h-11 text-xs border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors"
            >
              Rename
            </button>
            <button
              onClick={onDelete}
              className="px-3 min-h-11 text-xs border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableGroupRow({ group, studentCount, onEdit, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`hover:bg-background transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <td className="px-2 py-3 w-8">
        <GripHandle {...attributes} {...listeners} />
      </td>
      <td className="px-4 py-3 font-medium text-foreground">{group.name}</td>
      <td className="px-4 py-3 text-muted">{studentCount}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button
            onClick={onEdit}
            className="px-3 min-h-11 text-xs border border-border rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors"
          >
            Rename
          </button>
          <button
            onClick={onDelete}
            className="px-3 min-h-11 text-xs border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ManageGroupsTable({ groups, studentCounts }: ManageGroupsTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localGroups, setLocalGroups] = useState<ClassGroup[]>(groups);
  const [showAdd, setShowAdd] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<ClassGroup | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep local state in sync when server re-renders
  // (groups prop changes after add/delete/rename)
  const [prevGroups, setPrevGroups] = useState(groups);
  if (groups !== prevGroups) {
    setPrevGroups(groups);
    setLocalGroups(groups);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localGroups.findIndex((g) => g.id === active.id);
    const newIndex = localGroups.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(localGroups, oldIndex, newIndex);
    setLocalGroups(reordered);

    startTransition(async () => {
      const { error } = await reorderGroups(reordered.map((g) => g.id));
      if (error) {
        showError('Failed to save order. Please try again.');
        setLocalGroups(groups);
      } else {
        refresh();
      }
    });
  }

  async function handleDelete() {
    if (!deletingGroup) return;
    setDeleteLoading(true);
    const { error } = await deleteGroup(deletingGroup.id);
    setDeleteLoading(false);
    setDeletingGroup(null);
    if (error) {
      showError(
        error.includes('has students')
          ? 'Cannot delete a group that has students. Remove all students first.'
          : error
      );
    } else {
      refresh();
    }
  }

  const sortableIds = localGroups.map((g) => g.id);

  return (
    <>
      {errorMsg && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
        {localGroups.length === 0 ? (
          <div className="py-12 text-center text-muted text-sm">
            No groups yet. Add one to get started.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* Mobile card layout */}
            <div className="sm:hidden divide-y divide-border">
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {localGroups.map((group) => (
                  <SortableGroupCard
                    key={group.id}
                    group={group}
                    studentCount={studentCounts[group.id] ?? 0}
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => setDeletingGroup(group)}
                  />
                ))}
              </SortableContext>
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/70">
                    <th className="px-2 py-3 w-8" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Students
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {localGroups.map((group) => (
                      <SortableGroupRow
                        key={group.id}
                        group={group}
                        studentCount={studentCounts[group.id] ?? 0}
                        onEdit={() => setEditingGroup(group)}
                        onDelete={() => setDeletingGroup(group)}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          </DndContext>
        )}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="px-4 min-h-11 text-sm bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
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
