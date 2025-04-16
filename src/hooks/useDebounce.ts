import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value Valor a ser debounced
 * @param delay Tempo de espera em ms
 * @returns Valor após o debounce
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Atualizar o valor debounced após o delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpar o timeout se o valor mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}