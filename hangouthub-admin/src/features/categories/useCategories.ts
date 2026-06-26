import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from './categories.api';

export const categoriesKey = ['categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: fetchCategories,
    // Données de référence : on peut les garder fraîches longtemps.
    staleTime: 10 * 60_000,
  });
}
