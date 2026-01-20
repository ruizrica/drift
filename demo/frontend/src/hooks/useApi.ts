/**
 * API Hooks
 * 
 * ✓ PATTERN: Consistent data fetching hooks with loading/error states
 */

import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

export function useMutation<T, A extends unknown[]>(
  mutator: (...args: A) => Promise<T>
): {
  mutate: (...args: A) => Promise<T>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (...args: A) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutator(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [mutator]);

  return { mutate, loading, error };
}
