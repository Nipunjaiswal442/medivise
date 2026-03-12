import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Generic hook for calling async API functions with loading/error state.
 *
 * Usage:
 *   const { data, error, isLoading, execute } = useApi(llmService.sendMessage);
 *   await execute({ message: 'Hello' });
 */
export function useApi<TArgs extends unknown[], TResult>(
  apiFn: (...args: TArgs) => Promise<TResult>,
) {
  const [state, setState] = useState<UseApiState<TResult>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setState({ data: null, error: null, isLoading: true });
      try {
        const result = await apiFn(...args);
        setState({ data: result, error: null, isLoading: false });
        return result;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'An unexpected error occurred';
        setState({ data: null, error: message, isLoading: false });
        return undefined;
      }
    },
    [apiFn],
  );

  return { ...state, execute };
}
