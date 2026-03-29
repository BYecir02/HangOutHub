import { storage } from './api';

export type StoredLocation = {
  mode?: 'all' | 'city';
  cityId?: number;
  cityName?: string;
  region?: string | null;
  country?: string;
  latitude?: number;
  longitude?: number;
};

const LOCATION_KEY = 'selected_location';

export const getStoredLocation = async (): Promise<StoredLocation | null> => {
  const rawValue = await storage.getItem(LOCATION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredLocation | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setStoredLocation = async (
  value: StoredLocation | null,
): Promise<void> => {
  if (!value) {
    await storage.removeItem(LOCATION_KEY);
    return;
  }

  await storage.setItem(LOCATION_KEY, JSON.stringify(value));
};
