import { useCallback, useState } from 'react';

interface PaginatedResult<TItem> {
  items: TItem[];
  nextCursor?: string | null;
}

interface FetchPageParams {
  cursor?: string;
}

interface UsePaginatedListOptions<TItem> {
  fetchPage: (params: FetchPageParams) => Promise<PaginatedResult<TItem>>;
  getItemKey: (item: TItem) => string;
  mapError?: (error: unknown) => string;
  initialItems?: TItem[];
  initialCursor?: string | null;
}

function mergeUniqueByKey<TItem>(
  current: TItem[],
  incoming: TItem[],
  getItemKey: (item: TItem) => string,
) {
  const knownKeys = new Set(current.map((item) => getItemKey(item)));
  const merged = [...current];

  for (const item of incoming) {
    const key = getItemKey(item);
    if (knownKeys.has(key)) {
      continue;
    }
    knownKeys.add(key);
    merged.push(item);
  }

  return merged;
}

export function usePaginatedList<TItem>({
  fetchPage,
  getItemKey,
  mapError,
  initialItems = [],
  initialCursor = null,
}: UsePaginatedListOptions<TItem>) {
  const [items, setItems] = useState<TItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await fetchPage({});
      setItems(page.items || []);
      setNextCursor(page.nextCursor || null);
    } catch (errorValue) {
      setError(mapError ? mapError(errorValue) : null);
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, mapError]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const page = await fetchPage({});
      setItems(page.items || []);
      setNextCursor(page.nextCursor || null);
    } catch (errorValue) {
      setError(mapError ? mapError(errorValue) : null);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, mapError]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchPage({ cursor: nextCursor });
      setItems((current) =>
        mergeUniqueByKey(current, page.items || [], getItemKey),
      );
      setNextCursor(page.nextCursor || null);
    } catch (errorValue) {
      setError(mapError ? mapError(errorValue) : null);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, getItemKey, loading, loadingMore, mapError, nextCursor]);

  return {
    items,
    setItems,
    nextCursor,
    hasMore: Boolean(nextCursor),
    loading,
    refreshing,
    loadingMore,
    error,
    setError,
    loadInitial,
    refresh,
    loadMore,
  };
}
