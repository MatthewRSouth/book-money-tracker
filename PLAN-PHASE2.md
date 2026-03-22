# Book Money Tracker — Phase 2 Plan

## Context
Phase 1 delivered: auth, class group tabs, student table with book checkboxes, balance tracking, add student/book modals. Phase 2 adds edit/delete for students and books, student notes, and payment recording with a logged history.

**Confirmed decisions:**
- Book price edits retroactively adjust balances for all students who received the book (needs RPC)
- Notes display as a subtle sub-row below each student row (not tooltip)
- SPEC.md to be created alongside implementation

---

## 1. Database Migrations (run in Supabase SQL Editor in order)

### 1.1 Add notes to students
```sql
ALTER TABLE students ADD COLUMN notes TEXT;
```

### 1.2 Payments table
```sql
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_yen  INTEGER NOT NULL CHECK (amount_yen > 0),
  note        TEXT,
  paid_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_student_id_idx ON payments(student_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

`paid_at` is DATE (not TIMESTAMPTZ) — the school tracks which day the parent paid, not the exact time.

### 1.3 RPC: update_book (retroactive balance adjustment)
```sql
CREATE OR REPLACE FUNCTION update_book(
  p_book_id   UUID,
  p_title     TEXT,
  p_price_yen INTEGER
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_price INTEGER;
  v_delta     INTEGER;
BEGIN
  SELECT price_yen INTO STRICT v_old_price FROM books WHERE id = p_book_id;
  v_delta := p_price_yen - v_old_price;

  IF v_delta <> 0 THEN
    -- Retroactively adjust all students who received this book
    UPDATE students s
    SET balance_yen = balance_yen - v_delta
    FROM student_books sb
    WHERE sb.book_id = p_book_id AND sb.student_id = s.id;
  END IF;

  UPDATE books SET title = p_title, price_yen = p_price_yen WHERE id = p_book_id;
END; $$;

GRANT EXECUTE ON FUNCTION update_book TO authenticated;
```

### 1.4 RPC: delete_book_restore_balances
```sql
CREATE OR REPLACE FUNCTION delete_book_restore_balances(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_price INTEGER;
BEGIN
  SELECT price_yen INTO v_price FROM books WHERE id = p_book_id;
  UPDATE students s
  SET balance_yen = balance_yen + v_price
  FROM student_books sb
  WHERE sb.book_id = p_book_id AND sb.student_id = s.id;
  DELETE FROM books WHERE id = p_book_id;  -- cascades student_books
END; $$;

GRANT EXECUTE ON FUNCTION delete_book_restore_balances TO authenticated;
```

### 1.5 RPC: update_student
```sql
CREATE OR REPLACE FUNCTION update_student(
  p_student_id  UUID,
  p_name        TEXT,
  p_balance_yen INTEGER,
  p_notes       TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE students
  SET name = p_name, balance_yen = p_balance_yen, notes = p_notes
  WHERE id = p_student_id;
END; $$;

GRANT EXECUTE ON FUNCTION update_student TO authenticated;
```

### 1.6 RPC: delete_student
```sql
CREATE OR REPLACE FUNCTION delete_student(p_student_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM students WHERE id = p_student_id;
  -- student_books and payments cascade automatically
END; $$;

GRANT EXECUTE ON FUNCTION delete_student TO authenticated;
```

### 1.7 RPC: record_payment
```sql
CREATE OR REPLACE FUNCTION record_payment(
  p_student_id UUID,
  p_amount_yen INTEGER,
  p_note       TEXT,
  p_paid_at    DATE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE students SET balance_yen = balance_yen + p_amount_yen WHERE id = p_student_id;
  INSERT INTO payments (student_id, amount_yen, note, paid_at)
  VALUES (p_student_id, p_amount_yen, p_note, p_paid_at);
END; $$;

GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
```

---

## 2. New Files to Create

```
components/
  ui/
    DropdownMenu.tsx          # reusable ⋯ dropdown with keyboard nav + outside-click
    ConfirmDialog.tsx         # "are you sure?" wrapping Modal.tsx
  EditStudentModal.tsx        # name + balance (direct set) + notes
  EditBookModal.tsx           # title + price (with retroactive-adjustment warning)
  RecordPaymentModal.tsx      # amount + optional note + date
lib/
  actions/
    payments.ts               # recordPayment()
  utils/
    formatYen.ts              # extracted from BalanceCell (enables unit testing)
tests/
  setup.ts
  actions/
    students.test.ts
    books.test.ts
    payments.test.ts
    toggle.test.ts
  components/
    DropdownMenu.test.tsx
    ConfirmDialog.test.tsx
    RecordPaymentModal.test.tsx
  utils/
    formatYen.test.ts
vitest.config.ts
SPEC.md
```

## 3. Files to Modify

```
types/index.ts                # add notes to Student; add Payment interface
lib/actions/students.ts       # add updateStudent(), deleteStudent()
lib/actions/books.ts          # add updateBook() (via RPC), deleteBook() (via RPC)
components/StudentTable.tsx   # wire in all menus, modals, notes sub-rows
components/BalanceCell.tsx    # import formatYen from utils
components/SummaryBar.tsx     # import formatYen from utils
app/dashboard/page.tsx        # add notes to students SELECT query
```

---

## 4. Component Designs

### DropdownMenu.tsx
```typescript
interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}
interface DropdownMenuProps { items: DropdownMenuItem[]; }
```
- Trigger: `<button>` rendering `⋯` with `aria-haspopup="menu"`
- Outside-click: `mousedown` listener on `document` in `useEffect`
- Keyboard: Escape closes; Arrow keys navigate items
- Positioning: opens downward by default; flips upward if near viewport bottom
- Destructive items: `text-red-400`

### ConfirmDialog.tsx
```typescript
interface ConfirmDialogProps {
  isOpen: boolean; onClose: () => void;
  title: string; message: string;
  confirmLabel: string; onConfirm: () => void;
  loading?: boolean;
}
```
Confirm button: `bg-red-600 hover:bg-red-500 text-white`

### EditStudentModal.tsx
Fields: Name (text), Balance ¥ (number, direct set), Notes (textarea)
Helper text under balance: *"Directly sets the balance without recording a payment. Use 'Record payment' for incoming money."*
Calls: `updateStudent(id, name, balance, notes)`

### RecordPaymentModal.tsx
Fields: Amount ¥ (number, min=1, required), Note (text, optional), Date (date, defaults to today)
Title: `Record payment — {student.name}`
Calls: `recordPayment(studentId, amount, note | null, date)`

### EditBookModal.tsx
Fields: Title (text), Price ¥ (number, min=0)
Helper text under price: *"Changing the price will retroactively adjust balances for students who already received this book."*
Calls: `updateBook(id, title, price)` → RPC handles retroactive adjustment

### StudentTable.tsx additions
New state:
```typescript
const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);
const [payingStudent, setPayingStudent] = useState<StudentRow | null>(null);
const [editingBook, setEditingBook] = useState<Book | null>(null);
const [deletingBook, setDeletingBook] = useState<Book | null>(null);
```

Student row: name cell gets `flex items-center justify-between` — name on left, `<DropdownMenu>` on right with items: Edit student, Record payment, Delete.

Notes sub-row (when notes non-empty):
```tsx
<tr key={`${student.id}-notes`}>
  <td colSpan={2 + books.length} className="px-4 pb-2 text-xs text-zinc-500 italic">
    {student.notes}
  </td>
</tr>
```

Book column header: `<th>` gets relative positioning, `<DropdownMenu>` after title/price with items: Edit book, Delete book.

---

## 5. Server Actions

### students.ts additions
```typescript
updateStudent(studentId, name, balanceYen, notes) → rpc('update_student', ...)
deleteStudent(studentId) → rpc('delete_student', ...)
```

### books.ts additions
```typescript
// updateBook MUST use RPC — direct .update() would skip retroactive balance adjustment
updateBook(bookId, title, priceYen) → rpc('update_book', ...)
deleteBook(bookId) → rpc('delete_book_restore_balances', ...)
```

### payments.ts (new)
```typescript
recordPayment(studentId, amountYen, note, paidAt) → rpc('record_payment', ...)
```

---

## 6. Testing Setup

### Install
```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

### package.json scripts to add
```json
"test": "vitest run",
"test:watch": "vitest"
```

### What to test

| File | Key cases |
|---|---|
| `formatYen.test.ts` | positive, negative, zero |
| `students.test.ts` | updateStudent/deleteStudent call correct RPC; propagate errors; call revalidatePath |
| `books.test.ts` | updateBook uses RPC not direct update; deleteBook calls restore RPC |
| `payments.test.ts` | recordPayment passes correct params; converts empty note to null |
| `toggle.test.ts` | calls receive_book vs return_book based on receiving flag |
| `DropdownMenu.test.tsx` | opens/closes; Escape; outside click; Arrow keys; destructive styling; item callbacks |
| `ConfirmDialog.test.tsx` | renders message; onConfirm; onClose on cancel; loading state |
| `RecordPaymentModal.test.tsx` | date defaults to today; validates positive amount; calls recordPayment on submit |

---

## 7. Implementation Order

1. **Database** — run all SQL migrations (sections 1.1–1.7) in Supabase SQL Editor; verify each RPC works via the Supabase dashboard before writing TypeScript
2. **`types/index.ts`** — add `notes: string | null` to Student; add Payment interface
3. **`lib/utils/formatYen.ts`** — extract formatYen; update BalanceCell + SummaryBar imports (pure refactor, no behavior change)
4. **Vitest setup** — install packages, create `vitest.config.ts` and `tests/setup.ts`; run `formatYen.test.ts` first to confirm harness works
5. **`DropdownMenu` + `ConfirmDialog`** — pure UI primitives with no server dependencies; write and pass their tests
6. **Student server actions** — `updateStudent`, `deleteStudent` in `students.ts`; write and pass `students.test.ts`
7. **`EditStudentModal`** — depends on steps 5 + 6
8. **Wire student menus** — update `StudentTable` with ⋯ menus, notes sub-rows, `EditStudentModal`, delete `ConfirmDialog`; update dashboard page `SELECT` to include `notes`
9. **Payment action + modal** — `lib/actions/payments.ts`, `RecordPaymentModal`, tests; add "Record payment" to student dropdown in `StudentTable`
10. **Book server actions** — `updateBook` (RPC), `deleteBook` (RPC) in `books.ts`; write and pass `books.test.ts`
11. **`EditBookModal`** — with retroactive-adjustment helper text
12. **Wire book menus** — ⋯ menus on `<th>` book column headers; mount `EditBookModal` + delete `ConfirmDialog`
13. **`SPEC.md`** — write full feature specification
14. **Final checks** — `npm run build` (no TS errors), `npm run test` (all green), `npm run lint`

---

## 8. Key Design Decisions

| Decision | Rationale |
|---|---|
| `updateBook` uses RPC, not direct `.update()` | Must calculate price delta and retroactively adjust balances atomically |
| `deleteBook` restores balances via RPC | Prevents orphaned balance deductions when a book is removed |
| Payments are insert-only at RLS level | Payments are an append-only ledger; corrections go through "edit balance directly" |
| `paid_at` is DATE not TIMESTAMPTZ | School tracks the business date a parent paid, not the exact time |
| Notes as sub-row, not tooltip | Tooltips don't work on touch screens; sub-rows are always visible |
| `formatYen` extracted to `lib/utils/` | Enables unit testing; removes duplication between BalanceCell and SummaryBar |

---

## 9. Critical Files

- `components/StudentTable.tsx` — central client component; most complex changes (5 new state vars, all new modals, notes sub-rows, book header menus)
- `components/ui/DropdownMenu.tsx` — shared primitive used in both student rows and book headers; must handle keyboard nav and outside-click correctly
- `lib/actions/books.ts` — `updateBook` **must** use RPC (not direct `.update()`) to trigger retroactive balance adjustment
- `app/dashboard/page.tsx` — add `notes` to the students `SELECT` query or student notes will always be null
- `types/index.ts` — must be updated first; all other files depend on it
