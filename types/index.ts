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
}

export interface StudentRow extends Student {
  received_book_ids: Set<string>;
}
