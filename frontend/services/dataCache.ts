type CacheKey = 'events' | 'places' | 'discover' | 'explore' | 'categories';

const cache = new Map<CacheKey, unknown>();
const categoryCache = new Map<string, unknown>();

export function getCache<T>(key: CacheKey): T | null {
  return (cache.get(key) as T) ?? null;
}

export function setCache<T>(key: CacheKey, value: T): void {
  cache.set(key, value);
}

export function clearCache(key?: CacheKey): void {
  if (key) {
    cache.delete(key);
    return;
  }

  cache.clear();
}

export function getCategoryCache<T>(id: string): T | null {
  return (categoryCache.get(id) as T) ?? null;
}

export function setCategoryCache<T>(id: string, value: T): void {
  categoryCache.set(id, value);
}
