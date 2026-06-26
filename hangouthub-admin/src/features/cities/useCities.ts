import { useQuery } from '@tanstack/react-query';

import { fetchCities } from './cities.api';

export const citiesKey = ['cities'] as const;

export function useCities() {
  return useQuery({
    queryKey: citiesKey,
    queryFn: fetchCities,
    staleTime: 10 * 60_000,
  });
}
