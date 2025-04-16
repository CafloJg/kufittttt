import { useState, useCallback } from 'react';
import { retryOperation } from '../utils/errorUtils';

interface UseRetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  backoffFactor?: number;
  maxDelay?: number;
}

/**
 * Hook para executar operações com retry automático
 */
export function useRetry(options: UseRetryOptions = {}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const retry = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    setIsRetrying(true);
    setError(null);
    
    try {
      const result = await retryOperation(operation, {
        ...options,
        onRetry: (attempt) => {
          setRetryCount(attempt);
        }
      });
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsRetrying(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
    setError(null);
  }, []);

  return {
    retry,
    isRetrying,
    retryCount,
    error,
    reset
  };
}