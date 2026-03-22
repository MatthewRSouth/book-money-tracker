export interface ClassGroup {
  id: string;
  name: string;
  sort_order: number;
}

export interface Book {
  id: string;
  class_group_id: string;
  title: string;
  price_yen: number;
  sort_order: number;
}

export interface Student {
  id: string;
  class_group_id: string;
  name: string;
  balance_yen: number;
  notes: string | null;
}

export interface StudentRow extends Student {
  received_book_ids: Set<string>;
}

export interface Payment {
  id: string;
  student_id: string;
  amount_yen: number;
  note: string | null;
  paid_at: string;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  type: 'payment' | 'book';
  date: string;
  amount_yen: number;
  label: string;
  created_at: string;
}

export interface SearchResult {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
}

export interface ImportStudentRow {
  name: string;
  balance_yen: number;
  usesDefault: boolean; // true if balance came from the default field, not the file
  status: 'ok' | 'missing_name';
}

export interface GroupData {
  group: ClassGroup;
  books: Book[];
  students: StudentRow[];
}
