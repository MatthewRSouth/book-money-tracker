# Book Money Tracker — Phase 3 Plan

## Context
Phase 2 delivered: edit/delete students and books, student notes, record payments, dropdown menus, vitest setup.
Phase 3 adds: payment/distribution history log (unified timeline), /overview dashboard (cross-group alerts), group management (add/edit/delete groups, book reordering within a group), and a teal color scheme.

**Confirmed decisions:**
- History: unified timeline (payments + book distributions), triggered by clicking the balance cell
- Overview: `/overview` as a separate route
- Book reordering: up/down arrow buttons on book column headers (no drag library)
- Group delete: blocked if group has students (surfaced as an error)
- Color scheme: teal-500/600 accent for primary actions and active states; green/red unchanged for balances

---

## 1. Database Migrations (run in Supabase SQL Editor in order)

### 1.1 Add created_at to student_books (needed for history timeline)
```sql
ALTER TABLE student_books ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
```
> Existing rows will get NOW() as created_at — acceptable since they predate history tracking.

### 1.2 RPC: delete_class_group (blocked if has students)
```sql
CREATE OR REPLACE FUNCTION delete_class_group(p_group_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM students WHERE class_group_id = p_group_id) THEN
    RAISE EXCEPTION 'Cannot delete a group that has students';
  END IF;
  DELETE FROM class_groups WHERE id = p_group_id;
END; $$;

GRANT EXECUTE ON FUNCTION delete_class_group TO authenticated;
```

---

## 2. New Files to Create

```
components/
  StudentHistoryModal.tsx    # unified timeline of payments + book distributions
  AddGroupModal.tsx          # create new class group
  EditGroupModal.tsx         # rename existing class group
app/
  overview/
    page.tsx                 # cross-group dashboard: low balances, fully distributed
  manage/
    page.tsx                 # group management: add/edit/delete groups
lib/
  actions/
    history.ts               # getStudentHistory(studentId) → merged + sorted timeline
    groups.ts                # addGroup, updateGroup, deleteGroup
```

## 3. Files to Modify

```
types/index.ts               # add HistoryEntry, GroupWithCount
lib/actions/books.ts         # add moveBook(bookId, direction, classGroupId)
components/StudentTable.tsx  # ▲▼ reorder arrows on book headers; balance cell → opens history modal
components/ClassTabs.tsx     # teal active state; nav links to /overview and /manage
app/dashboard/page.tsx       # thread groups to ClassTabs for nav links (already passes groups)

# Color scheme (teal submit buttons, teal active states, teal focus rings):
components/AddStudentModal.tsx
components/AddBookModal.tsx
components/EditStudentModal.tsx
components/EditBookModal.tsx
components/RecordPaymentModal.tsx
components/ui/Modal.tsx      # teal focus ring on × button
```

---

## 4. Color Scheme Changes

| Element | Before | After |
|---|---|---|
| Primary submit button | `bg-zinc-100 hover:bg-white text-zinc-900` | `bg-teal-600 hover:bg-teal-500 text-white` |
| Active tab | `bg-zinc-700 text-zinc-100` | `bg-teal-700 text-white` |
| Input focus border | `focus:border-zinc-500` | `focus:border-teal-500` |
| Clickable student name hover | `hover:text-white` | `hover:text-teal-300` |
| Dropdown menu trigger hover | `hover:bg-zinc-700` | unchanged (neutral, not a primary action) |
| Balance cell (positive) | `text-green-400` | unchanged |
| Balance cell (negative) | `text-red-400` | unchanged |
| Destructive buttons | `bg-red-600 hover:bg-red-500` | unchanged |

---

## 5. Feature Designs

### 5.1 History Log (StudentHistoryModal.tsx)

**Trigger:** Clicking the balance cell opens the history modal.

**Data shape (`HistoryEntry` in `types/index.ts`):**
```typescript
export interface HistoryEntry {
  id: string;
  type: 'payment' | 'book';
  date: string;          // paid_at (payment) or created_at date (book)
  amount_yen: number;    // positive for payments, negative for books
  label: string;         // note (payment) or book title (book distribution)
  created_at: string;    // for sort tiebreaking
}
```

**`lib/actions/history.ts`:**
```typescript
getStudentHistory(studentId): Promise<{ entries: HistoryEntry[]; error: string | null }>
```
- Fetches payments: `SELECT id, amount_yen, note, paid_at, created_at FROM payments WHERE student_id = ?`
- Fetches distributions: `SELECT sb.book_id, sb.created_at, b.title, b.price_yen FROM student_books sb JOIN books b ON b.id = sb.book_id WHERE sb.student_id = ?`
- Merges, sorts by date desc then created_at desc
- Returns unified `HistoryEntry[]`

**UI:** Modal (max-w-lg), scrollable list. Each row:
- Payment: green `+¥X,XXX` on right, note or "Payment" on left, date below
- Book: red `−¥X,XXX` on right, book title on left, date below
- Empty state: "No history yet."
- Loading state: spinner

### 5.2 Overview Page (app/overview/page.tsx)

Server component. Fetches all groups + all students + all book coverage in one pass.

**Sections:**
1. **Negative balances** — students where `balance_yen < 0`, grouped by class, sorted worst-first. Shows name, group, balance.
2. **No books yet** — students who have received 0 books. Shows name, group.
3. **Fully distributed** — students who received every book in their group. Shows name, group, balance.
4. **Group summaries** — each group: student count, total balance, book count.

No client-side interactivity — read-only snapshot. Link back to `/dashboard`.

**Nav link:** Add "Overview" link to the dashboard header alongside class tabs.

### 5.3 Group Management (app/manage/page.tsx)

Server component listing all groups with client islands for add/edit/delete.

**`lib/actions/groups.ts`:**
```typescript
addGroup(name: string): Promise<{ error: string | null }>
  → INSERT INTO class_groups (name, sort_order) VALUES (name, MAX(sort_order)+1)

updateGroup(groupId: string, name: string): Promise<{ error: string | null }>
  → UPDATE class_groups SET name = ? WHERE id = ?

deleteGroup(groupId: string): Promise<{ error: string | null }>
  → rpc('delete_class_group', { p_group_id: groupId })
  → surfaces 'Cannot delete a group that has students' as user-friendly error
```

**`app/manage/page.tsx`:**
- Lists groups in sort_order
- Each row: group name, student count, edit (pencil → EditGroupModal), delete (trash → ConfirmDialog)
- "+ Add group" button → AddGroupModal
- Delete blocked server-side; error shown inline on failure
- "← Back to dashboard" link

**AddGroupModal / EditGroupModal:** Single text field (group name), teal submit button.

### 5.4 Book Reordering (in StudentTable.tsx)

**`moveBook(bookId, direction, classGroupId)` in `lib/actions/books.ts`:**
- Fetches all books for classGroupId ordered by sort_order
- Finds current book index
- Swaps sort_order with the adjacent book (up = lower index, down = higher index)
- No-ops at boundaries (first book can't move up; last can't move down)
- Updates both books in two direct `.update()` calls (no atomic RPC needed — sort_order reorders display only, no balance impact)

**UI:** Two small arrow buttons `▲` / `▼` added to the book `<th>` between the title and the `⋯` menu:
- First book: `▲` disabled
- Last book: `▼` disabled
- Disabled state: `opacity-30 cursor-not-allowed`
- Buttons: `p-0.5 text-zinc-400 hover:text-teal-300 transition-colors`

---

## 6. Implementation Order

1. **DB** — run migrations 1.1 and 1.2 in Supabase SQL Editor
2. **`types/index.ts`** — add HistoryEntry interface
3. **Color scheme** — update all modal submit buttons, ClassTabs active state, input focus rings, student name hover; verify no regressions
4. **`lib/actions/history.ts`** + **`StudentHistoryModal.tsx`** — wire balance cell as trigger in StudentTable
5. **`lib/actions/groups.ts`** + **`AddGroupModal`** + **`EditGroupModal`** + **`app/manage/page.tsx`** — group CRUD
6. **Nav links** — add Overview and Manage links to dashboard header
7. **`moveBook()`** in books.ts + arrow buttons in StudentTable book headers
8. **`app/overview/page.tsx`** — cross-group read-only snapshot

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| History triggered by balance cell click | Balance is the most natural "what happened?" entry point; avoids adding a 4th item to the three-dot menu |
| `student_books.created_at` added retroactively | Existing rows get NOW(); history will be accurate going forward |
| Book reorder via two direct updates, no RPC | sort_order is display-only; no balance impact; atomicity not required |
| Group delete blocked server-side via RPC | Prevents orphaning student records; error surfaced inline in UI |
| `/overview` as separate route | Cross-group view has fundamentally different data shape; keeping it separate avoids complexity in the dashboard page |
| Teal accent only on primary/active states | Keep neutral (zinc) for secondary/cancel actions and dropdown triggers — calm, not flashy |

---

## 8. Critical Files

- `components/StudentTable.tsx` — most changes: balance cell click, book reorder arrows, history modal mount
- `lib/actions/history.ts` — must merge and sort two different data shapes correctly
- `lib/actions/groups.ts` — deleteGroup must propagate the RPC error message cleanly
- `app/manage/page.tsx` — new server page; needs auth check consistent with dashboard
- `app/overview/page.tsx` — fetches all groups + students at once; must handle empty groups gracefully
