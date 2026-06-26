import { api } from '@/lib/api/client';

export interface City {
  id: number;
  name: string;
  country?: string | null;
}

export async function fetchCities() {
  const { data } = await api.get<City[]>('/cities');
  return data;
}
