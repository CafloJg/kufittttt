import { useState, useCallback } from 'react';

/**
 * Hook para lidar com erros assíncronos em componentes funcionais
 * Permite que erros assíncronos sejam capturados por Error Boundaries
 */
export function useAsyncError() {
  const [, setError] = useState();
  
  return useCallback(
    (e: Error) => {
      console.error('Throwing async error to Error Boundary:', e);
      setError(() => {
        throw e;
      });
    },
    [setError],
  );
}