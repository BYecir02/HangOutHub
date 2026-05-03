import { useCallback, useState } from 'react';

type AsyncRunMode = 'initial' | 'refresh' | 'background';

interface UseScreenAsyncOptions {
  initialLoading?: boolean;
  initialError?: string | null;
}

interface AsyncRunOptions {
  mode?: AsyncRunMode;
  clearError?: boolean;
  mapError?: (error: unknown) => string;
  onError?: (error: unknown) => void;
}

export function useScreenAsync(options: UseScreenAsyncOptions = {}) {
  const [loading, setLoading] = useState(options.initialLoading ?? true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(options.initialError ?? null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const run = useCallback(
    async <T>(
      task: () => Promise<T>,
      runOptions: AsyncRunOptions = {},
    ): Promise<T | null> => {
      const mode = runOptions.mode || 'initial';
      const shouldClearError = runOptions.clearError ?? true;

      if (shouldClearError) {
        setError(null);
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else if (mode === 'initial') {
        setLoading(true);
      }

      try {
        const result = await task();
        setHasLoaded(true);
        return result;
      } catch (errorValue) {
        if (runOptions.mapError) {
          setError(runOptions.mapError(errorValue));
        }
        runOptions.onError?.(errorValue);
        return null;
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else if (mode === 'initial') {
          setLoading(false);
        }
      }
    },
    [],
  );

  const runInitial = useCallback(
    async <T>(
      task: () => Promise<T>,
      runOptions: Omit<AsyncRunOptions, 'mode'> = {},
    ) => run(task, { ...runOptions, mode: 'initial' }),
    [run],
  );

  const runRefresh = useCallback(
    async <T>(
      task: () => Promise<T>,
      runOptions: Omit<AsyncRunOptions, 'mode'> = {},
    ) => run(task, { ...runOptions, mode: 'refresh' }),
    [run],
  );

  const runBackground = useCallback(
    async <T>(
      task: () => Promise<T>,
      runOptions: Omit<AsyncRunOptions, 'mode'> = {},
    ) => run(task, { ...runOptions, mode: 'background' }),
    [run],
  );

  return {
    loading,
    refreshing,
    error,
    hasLoaded,
    setError,
    run,
    runInitial,
    runRefresh,
    runBackground,
  };
}
