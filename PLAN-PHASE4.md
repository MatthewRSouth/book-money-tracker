# Book Money Tracker — Phase 4 Plan

## Context
Phase 3 delivered: unified history timeline, /overview dashboard, group management (add/edit/delete), book reordering, teal color scheme.

Phase 4 adds: global student search, CSV/Excel export, CSV/Excel import, bulk book distribution, and year rollover.

---

## 1. Database Migrations (run in Supabase SQL Editor in order)

### 1.1 RPC: bulk_receive_book
Atomically distributes a book to all students in a group who haven't received it yet.
```sql
CREATE OR REPLACE FUNCTION bulk_receive_book(p_book_id UUID, p_class_group_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_price_yen INT;
  v_count INT;
BEGIN
  SELECT price_yen INTO v_price_yen FROM books WHERE id = p_book_id;

  WITH inserted AS (
    INSERT INTO student_books (student_id, book_id, created_at)
    SELECT s.id, p_book_id, NOW()
    FROM students s
    WHERE s.class_group_id = p_class_group_id
    AND NOT EXISTS (
      SELECT 1 FROM student_books sb
      WHERE sb.student_id = s.id AND sb.book_id = p_book_id
    )
    RETURNING student_id
  ),
  updated AS (
    UPDATE students s
    SET balance_yen = s.balance_yen - v_price_yen
    FROM inserted i
    WHERE s.id = i.student_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END; $$;

GRANT EXECUTE ON FUNCTION bulk_receive_book TO authenticated;
```

### 1.2 RPC: rollover_keep_structure
Clears students, payments, and book assignments while keeping groups and books intact.
```sql
CREATE OR REPLACE FUNCTION rollover_keep_structure()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM payments;
  DELETE FROM student_books;
  DELETE FROM students;
END; $$;

GRANT EXECUTE ON FUNCTION rollover_keep_structure TO authenticated;
```

### 1.3 RPC: rollover_full_reset
Clears everything — groups, books, students, payments.
```sql
CREATE OR REPLACE FUNCTION rollover_full_reset()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM payments;
  DELETE FROM student_books;
  DELETE FROM students;
  DELETE FROM books;
  DELETE FROM class_groups;
END; $$;

GRANT EXECUTE ON FUNCTION rollover_full_reset TO authenticated;
```

---

## 2. New Dependency

```
xlsx (SheetJS)
```
Used for both export (write XLSX) and import (parse CSV + XLSX). Dynamic-imported only when needed so it doesn't bloat the initial bundle.

```bash
npm install xlsx
```

---

## 3. New Files to Create

```
components/
  GlobalSearch.tsx         # search bar + live dropdown of matching students
  ImportStudentsModal.tsx  # file upload → parse → preview table → bulk insert
  BulkReceiveModal.tsx     # "give this book to all students?" confirm dialog
app/
  rollover/
    page.tsx               # year rollover: summary, export archive, execute
lib/
  actions/
    search.ts              # searchStudents(query) → SearchResult[]
    bulk.ts                # bulkReceiveBook(bookId, classGroupId) → count
    rollover.ts            # getRolloverSummary(), exportAllData(), executeRollover(mode)
    import.ts              # bulkAddStudents(rows[], classGroupId)
```

## 4. Files to Modify

```
package.json               # add xlsx dependency
types/index.ts             # add SearchResult, ImportStudentRow
app/dashboard/page.tsx     # read highlight searchParam; add GlobalSearch + Export + Import to header
app/layout.tsx             # (if nav link for Rollover goes in global layout)
components/StudentTable.tsx  # highlight row + scroll; bulk receive button on book headers
components/ClassTabs.tsx   # add "Rollover" nav link alongside Overview / Manage
```

---

## 5. Feature Designs

### 5.1 Global Search (GlobalSearch.tsx)

**Placement:** Dashboard header, between the app title and nav links.

**`lib/actions/search.ts`:**
```typescript
export interface SearchResult {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
}

searchStudents(query: string): Promise<SearchResult[]>
```
- Query (minimum 2 chars): `SELECT s.id, s.name, g.id, g.name FROM students s JOIN class_groups g ON g.id = s.class_group_id WHERE s.name ILIKE '%query%' ORDER BY g.sort_order, s.name LIMIT 10`
- Returns empty array for queries shorter than 2 chars.

**`components/GlobalSearch.tsx`** (`'use client'`):
- Controlled `<input>` with 300ms debounce.
- Dropdown list of up to 10 results, each showing student name + group name in smaller text.
- Clicking a result: `router.push('/dashboard?group=<groupId>&highlight=<studentId>')` and clears the input + dropdown.
- Clicking outside closes the dropdown.
- Loading state: spinner icon in the input while fetching.
- Empty state (query ≥ 2, no results): "No students found."

**Highlight in StudentTable:**
- `app/dashboard/page.tsx` reads `searchParams.highlight` (string | undefined) and passes it as `highlightStudentId` prop to StudentTable.
- StudentTable: on mount / when `highlightStudentId` changes, scrolls the matching row into view and applies a ring for 2 seconds:
  ```
  ring-2 ring-teal-400 ring-offset-1 ring-offset-zinc-900
  ```
  Implemented via a ref map keyed by student ID + `useEffect` that removes the class after 2000ms.

---

### 5.2 CSV/Excel Export

**Placement:** A small "Export" button in the dashboard above the student table, aligned right (same row as "Add student" and "Add book").

**Implementation:** Entirely client-side — no server action needed. StudentTable already has all the data.

**Exported columns:**
| Name | Balance (¥) | Notes | [Book 1 Title] | [Book 2 Title] | … |
Each book column: `✓` if received, empty if not.

**Two download options (split button or dropdown):**
- **CSV** — built from scratch, no library:
  ```typescript
  const csv = [headerRow, ...dataRows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  // BOM prefix (\uFEFF) ensures Excel opens it without encoding issues
  ```
- **Excel (.xlsx)** — SheetJS dynamic import:
  ```typescript
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, groupName);
  XLSX.writeFile(wb, `${groupName}.xlsx`);
  ```

Filename: `{groupName}-{YYYY-MM-DD}.csv` / `.xlsx`

**UI:** A single "Export ▾" button that opens a small dropdown with "CSV" and "Excel (.xlsx)" options. Reuse the existing `DropdownMenu` component.

---

### 5.3 CSV/Excel Import (ImportStudentsModal.tsx)

**Placement:** A "Import" button next to "Add student" in the dashboard header area.

**`lib/actions/import.ts`:**
```typescript
bulkAddStudents(
  rows: { name: string; balance_yen: number }[],
  classGroupId: string
): Promise<{ inserted: number; error: string | null }>
```
- Single `INSERT INTO students (name, balance_yen, class_group_id) VALUES …` for all rows.
- Returns inserted count on success.

**`components/ImportStudentsModal.tsx`** flow:
1. **Step 1 — Upload:** File input accepting `.csv`, `.xlsx`, `.xls`. On file select, parse client-side with SheetJS (`XLSX.read`, then `XLSX.utils.sheet_to_json`).
2. **Column mapping rules:**
   - Looks for a column named `name` (case-insensitive) for student name — required.
   - Looks for `balance`, `starting_balance`, or `balance_yen` (case-insensitive) for starting balance — optional, defaults to the "default starting balance" field (see Step 2).
   - Rows with a blank name are skipped.
3. **Step 2 — Preview:** After parsing, before the preview table, show a **"Default starting balance" number input** (default `20000`) that applies to any student whose row has no balance column or a blank balance. The preview table shows: Name | Starting Balance | Status (`OK` / `Missing name` in red). Changing the default balance field live-updates the preview balances for all rows that fall back to it. Row count summary: "X students ready to import, Y rows skipped."
4. **Error state:** If no recognized columns found, show "Could not find a 'name' column. Check your file and try again."
5. **Step 3 — Confirm:** "Import X students into [Group Name]" teal button → calls `bulkAddStudents`. On success, closes modal and calls `router.refresh()`.

---

### 5.4 Bulk Book Distribution (BulkReceiveModal.tsx)

**Placement:** Each book column header in StudentTable gains a "⬇ All" button, sitting alongside the existing ▲▼ arrows and ⋯ menu.

**`lib/actions/bulk.ts`:**
```typescript
bulkReceiveBook(bookId: string, classGroupId: string): Promise<{ count: number; error: string | null }>
  → rpc('bulk_receive_book', { p_book_id: bookId, p_class_group_id: classGroupId })
```

**`components/BulkReceiveModal.tsx`:**
- Props: `book`, `students` (current group's students), `receivedBookIds` map.
- Computes the list of students who haven't received the book: `students.filter(s => !receivedMap.get(s.id)?.has(book.id))`.
- Modal content:
  - "Give **[Book Title]** (¥X,XXX) to **N students** who haven't received it yet?"
  - Lists those student names in a small scrollable area (max 8 rows, then scroll).
  - If all students already have it: "All students already have this book." with no confirm button.
- Teal confirm button → calls `bulkReceiveBook` → calls `router.refresh()`.
- Optimistic update: after confirm, immediately update `localStudents` for all affected students (deduct price, add book to receivedSet) before the refresh arrives.

**Button styling:** Same as ▲▼ arrows — `p-0.5 text-zinc-400 hover:text-teal-300 transition-colors`; tooltip "Distribute to all" on hover.

---

### 5.5 Year Rollover (app/rollover/page.tsx)

**Placement:** "Rollover" link in the ClassTabs/dashboard header nav (alongside Overview and Manage).

**`lib/actions/rollover.ts`:**
```typescript
getRolloverSummary(): Promise<{ groups, students, books, payments, totalBalanceYen }>
  → parallel fetch of counts + sum(balance_yen)

exportAllData(): Promise<{ groups, students, books, payments, studentBooks }>
  → full data dump for archive CSV generation

executeRollover(mode: 'keep_structure' | 'full_reset'): Promise<{ error: string | null }>
  → rpc(mode === 'keep_structure' ? 'rollover_keep_structure' : 'rollover_full_reset')
  → revalidatePath('/dashboard')
```

**`app/rollover/page.tsx`** (server component + client islands):

**Step 1 — Summary panel (server):**
- Header: "Year Rollover" with a warning banner: "This will permanently delete student records. Download the archive first."
- Stats: X groups · Y students · Z books · W payments · Total balance ¥X,XXX.

**Step 2 — Archive download (client island):**
- "Download archive (CSV)" button — client-side, calls `exportAllData()` server action, then generates a multi-sheet CSV zip OR a single XLSX with multiple sheets (groups, students, books, payments, student_books), downloaded as `archive-{YYYY-MM-DD}.xlsx`.
- This is strongly encouraged before proceeding.

**Step 3 — Choose mode (client island):**
```
○ Keep groups & books — clears students and payments. Groups and book lists stay intact.
    Use this at the start of each school year to onboard a new class.

○ Full reset — deletes everything. Start completely from scratch.
```

**Step 4 — Confirm + execute (client island):**
- Text input: "Type ROLLOVER to confirm"
- Execute button (red, `bg-red-600 hover:bg-red-500`) — disabled until input matches exactly.
- On confirm: calls `executeRollover(mode)`. On success: `router.push('/dashboard')`.
- Inline error display if RPC fails.

**"← Back to dashboard" link** at the top.

---

## 6. Implementation Order

1. **Dependency** — `npm install xlsx`
2. **DB** — run migrations 1.1, 1.2, 1.3 in Supabase SQL Editor
3. **`types/index.ts`** — add `SearchResult`, `ImportStudentRow`
4. **Search** — `lib/actions/search.ts` + `GlobalSearch.tsx` + dashboard highlight wiring
5. **Export** — Export dropdown inside StudentTable (CSV + XLSX, client-side)
6. **Import** — `lib/actions/import.ts` + `ImportStudentsModal.tsx` + trigger button in dashboard
7. **Bulk receive** — `lib/actions/bulk.ts` + `BulkReceiveModal.tsx` + "⬇ All" button in book headers
8. **Rollover** — `lib/actions/rollover.ts` + `app/rollover/page.tsx` + nav link in ClassTabs

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| Search uses URL params for highlight (`?highlight=<id>`) | Survives page navigation; standard Next.js pattern; no client state needed across route transitions |
| Search minimum 2 chars | Avoids fetching for single-char queries that return too many results |
| Export is fully client-side | All data is already in StudentTable props; no round-trip needed |
| CSV BOM prefix (`\uFEFF`) | Ensures Excel on Windows renders Japanese names correctly without garbling |
| SheetJS dynamic import | ~900KB library only loaded on demand (export click or import modal open), not in initial bundle |
| Import uses single bulk INSERT | N round-trips for N students would be slow; one INSERT is fast and atomic |
| Import column detection is case-insensitive | Handles variations like "Name", "NAME", "Student Name" etc. |
| Bulk receive is an atomic RPC | Prevents partial state where some students get the book but balance updates fail |
| `bulk_receive_book` skips students who already have the book | Idempotent — safe to click accidentally; no double-deduction |
| Rollover archive is XLSX multi-sheet | One file with all related tables is more useful than multiple CSV files |
| Rollover requires typing "ROLLOVER" | Extra friction prevents accidental execution of an irreversible action |
| Two rollover modes (keep vs. full reset) | Most common use is year-start with same groups — keep_structure covers 90% of cases |
| No new archive tables in DB | Avoids schema complexity; downloaded file is the archive; school data volumes are small |

---

## 8. New Types (types/index.ts additions)

```typescript
export interface SearchResult {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
}

export interface ImportStudentRow {
  name: string;
  balance_yen: number;
  status: 'ok' | 'missing_name';
}
```

---

## 9. Critical Files

- `components/GlobalSearch.tsx` — debounce + dropdown + outside-click dismiss + router navigation
- `components/StudentTable.tsx` — receives `highlightStudentId` prop; scroll + ring effect; new "⬇ All" + Export buttons
- `components/ImportStudentsModal.tsx` — file parsing edge cases (header detection, blank rows, non-numeric balance)
- `lib/actions/bulk.ts` — must propagate RPC errors cleanly (e.g., if book doesn't exist)
- `lib/actions/rollover.ts` — `executeRollover` is irreversible; must revalidate all paths afterward
- `app/rollover/page.tsx` — confirm input must prevent accidental submission; archive download should be clearly encouraged

---

## 10. What Is NOT in Phase 4

- Pagination or lazy loading (class sizes are small; not needed)
- Student search within a single group (global search covers this)
- Undo for rollover (archive download is the recovery path)
- Per-student archive / history export (global archive covers the data)
- Role-based access / multi-teacher support
