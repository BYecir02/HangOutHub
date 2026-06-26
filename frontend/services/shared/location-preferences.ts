import { storage } from '../api';

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

type LocationListener = (value: StoredLocation | null) => void;

const listeners = new Set<LocationListener>();

/**
 * S'abonne aux changements de localisation sélectionnée.
 * Permet à tous les écrans montés de rester synchronisés instantanément,
 * sans dépendre du focus.
 */
export const subscribeStoredLocation = (
  listener: LocationListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyLocationChange = (value: StoredLocation | null): void => {
  listeners.forEach((listener) => listener(value));
};

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
    notifyLocationChange(null);
    return;
  }

  await storage.setItem(LOCATION_KEY, JSON.stringify(value));
  notifyLocationChange(value);
};
