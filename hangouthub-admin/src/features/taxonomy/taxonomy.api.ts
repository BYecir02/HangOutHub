import { api } from '@/lib/api/client';

export interface TaxonomyTag {
  id: number;
  name: string;
  status: string;
  submittedByUserId?: string | null;
}

export interface TaxonomyCategory {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  Tag: TaxonomyTag[];
}

/** Taxonomie complète (toutes catégories + tous tags, incl. PENDING/REJECTED). */
export async function fetchTaxonomy() {
  const { data } = await api.get<TaxonomyCategory[]>('/categories/admin');
  return data;
}

export async function createCategory(payload: {
  name: string;
  color?: string;
  icon?: string;
}) {
  const { data } = await api.post('/categories', payload);
  return data;
}

export async function updateCategory(
  id: number,
  payload: { name?: string; color?: string; icon?: string },
) {
  const { data } = await api.patch(`/categories/${id}`, payload);
  return data;
}

export async function createTag(categoryId: number, name: string) {
  const { data } = await api.post(`/categories/${categoryId}/tags`, { name });
  return data;
}

export async function updateTag(
  tagId: number,
  payload: { name?: string; status?: string; categoryId?: number },
) {
  const { data } = await api.patch(`/categories/tags/${tagId}`, payload);
  return data;
}
