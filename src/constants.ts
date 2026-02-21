import { ShoppingItem } from './types';

export const BASIC_BASKET_ITEMS: Omit<ShoppingItem, 'id'>[] = [
  { name: 'Arroz', quantity: 3, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Feijão', quantity: 2, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Açúcar', quantity: 1, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Café', quantity: 500, unit: 'g', category: 'Mercearia', bought: false },
  { name: 'Óleo', quantity: 2, unit: 'litros', category: 'Mercearia', bought: false },
  { name: 'Leite', quantity: 4, unit: 'litros', category: 'Laticínios', bought: false },
  { name: 'Macarrão', quantity: 1, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Sardinha', quantity: 2, unit: 'unidades', category: 'Mercearia', bought: false },
  { name: 'Farinha de trigo', quantity: 1, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Sal', quantity: 1, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Massa de milho', quantity: 1, unit: 'kg', category: 'Mercearia', bought: false },
  { name: 'Carne bovina', quantity: 2, unit: 'kg', category: 'Carnes', bought: false },
  { name: 'Frango', quantity: 2, unit: 'kg', category: 'Carnes', bought: false },
  { name: 'Ovos', quantity: 1, unit: 'dúzia', category: 'Mercearia', bought: false },
  { name: 'Papel higiênico', quantity: 4, unit: 'rolos', category: 'Higiene', bought: false },
  { name: 'Sabonete', quantity: 4, unit: 'unidades', category: 'Higiene', bought: false },
  { name: 'Detergente', quantity: 2, unit: 'unidades', category: 'Limpeza', bought: false },
];

export const CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Carnes', icon: '🥩' },
  { name: 'Hortifruti', icon: '🥦' },
  { name: 'Laticínios', icon: '🥛' },
  { name: 'Padaria', icon: '🍞' },
  { name: 'Mercearia', icon: '🍚' },
  { name: 'Limpeza', icon: '🧼' },
  { name: 'Higiene', icon: '🧻' },
  { name: 'Bebidas', icon: '🥤' },
];
