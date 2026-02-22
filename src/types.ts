export type Category = 
  | 'Carnes' 
  | 'Hortifruti' 
  | 'Laticínios' 
  | 'Padaria' 
  | 'Mercearia' 
  | 'Limpeza' 
  | 'Higiene' 
  | 'Bebidas';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  bought: boolean;
  price?: number;
  addedBy?: string;
}

export interface HistoryEntry {
  id: string | number;
  date: string;
  total_items: number;
  total_price: number;
  items: ShoppingItem[];
  savedBy?: string;
  casalId?: string | null;
}

export interface User {
  id: string | number;
  email: string;
}
