type CacheKey =
  | 'events'
  | 'homeEvents'
  | 'exploreEvents'
  | 'places'
  | 'discover'
  | 'explore'
  | 'categories'
  | 'cities';

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
};

const DEFAULT_TTL_MS: Partial<Record<CacheKey, number>> = {
  events: 5 * 60 * 1000,
  homeEvents: 5 * 60 * 1000,
  exploreEvents: 5 * 60 * 1000,
  places: 10 * 60 * 1000,
  categories: 30 * 60 * 1000,
  cities: 60 * 60 * 1000,
};

const cache = new Map<CacheKey, CacheEntry<unknown>>();
const categoryCache = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: CacheKey): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache<T>(key: CacheKey, value: T, ttlMs?: number): void {
  const resolvedTtl = ttlMs ?? DEFAULT_TTL_MS[key] ?? null;
  cache.set(key, {
    value,
    expiresAt: resolvedTtl !== null ? Date.now() + resolvedTtl : null,
  });
}

export function clearCache(key?: CacheKey): void {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}

export function getCategoryCache<T>(id: string): T | null {
  const entry = categoryCache.get(id) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    categoryCache.delete(id);
    return null;
  }
  return entry.value;
}

export function setCategoryCache<T>(id: string, value: T, ttlMs = 10 * 60 * 1000): void {
  categoryCache.set(id, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}
