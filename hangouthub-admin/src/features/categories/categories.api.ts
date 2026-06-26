import { api } from '@/lib/api/client';

export interface CategoryTag {
  id: number;
  name: string;
  status?: string | null;
}

export interface Category {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  /** Tags rattachés à la catégorie (renvoyés par GET /categories). */
  Tag?: CategoryTag[];
}

export async function fetchCategories() {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}
