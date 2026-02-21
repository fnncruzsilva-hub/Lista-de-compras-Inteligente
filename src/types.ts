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
}

export interface HistoryEntry {
  id: number;
  date: string;
  total_items: number;
  total_price: number;
  items: ShoppingItem[];
}

export interface User {
  id: number;
  email: string;
}
