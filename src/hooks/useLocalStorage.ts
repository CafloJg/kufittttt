import { useState, useEffect } from 'react';

/**
 * Hook para persistir dados no localStorage com tipagem
 * @param key Chave para armazenar no localStorage
 * @param initialValue Valor inicial caso não exista no localStorage
 * @returns [value, setValue] - Valor atual e função para atualizar
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Função para obter o valor inicial do localStorage ou usar o valor padrão
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // Estado para armazenar o valor atual
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Função para atualizar o valor no localStorage e no estado
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permitir que o valor seja uma função para seguir o mesmo padrão do useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Salvar no estado
      setStoredValue(valueToStore);
      
      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Disparar evento para sincronizar entre abas
        window.dispatchEvent(new StorageEvent('storage', {
          key: key,
          newValue: JSON.stringify(valueToStore)
        }));
      }
    } catch (error) {
      console.warn(`Erro ao salvar localStorage key "${key}":`, error);
    }
  };

  // Sincronizar com localStorage quando a chave muda
  useEffect(() => {
    setStoredValue(readValue());
  }, [key]);

  // Sincronizar com outras abas/janelas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}