import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useError } from '../context/ErrorContext';
import { formatErrorMessage, categorizeError } from '../utils/errorUtils';
import { reportError } from '../utils/errorReporting';

/**
 * Hook centralizado para gerenciar estados de carregamento
 * @param initialState Estado inicial de carregamento
 * @returns Objeto com estado e funções para controlar o carregamento
 */
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      startLoading();
      return await fn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading
  };
}

/**
 * Hook para gerenciar navegação com tratamento de erros
 * @returns Objeto com funções para navegação segura
 */
export function useNavigation() {
  const navigate = useNavigate();
  const { setError } = useError();

  const navigateSafely = useCallback((
    path: string, 
    options?: { 
      replace?: boolean, 
      state?: any,
      onError?: (error: Error) => void
    }
  ) => {
    try {
      navigate(path, { 
        replace: options?.replace || false,
        state: options?.state
      });
    } catch (error) {
      console.error('Navigation error:', error);
      setError(error);
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  }, [navigate, setError]);

  return { navigateSafely };
}

/**
 * Hook para gerenciar operações assíncronas com tratamento de erros
 * @returns Objeto com funções para executar operações assíncronas com tratamento de erros
 */
export function useAsyncOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { setError: setGlobalError } = useError();

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void,
      onError?: (error: Error) => void,
      showGlobalError?: boolean,
      errorContext?: string
    }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (options?.showGlobalError !== false) {
        setGlobalError(error, { 
          context: options?.errorContext || 'Erro na operação'
        });
      }
      
      if (options?.onError) {
        options.onError(error);
      }
      
      // Reportar erro para serviço de monitoramento
      const { isCritical } = categorizeError(error);
      reportError(error, {
        context: options?.errorContext,
        severity: isCritical ? 'critical' : 'error'
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setGlobalError]);

  return {
    isLoading,
    error,
    execute,
    clearError: () => setError(null)
  };
}

/**
 * Hook para gerenciar formulários com validação
 * @param initialValues Valores iniciais do formulário
 * @returns Objeto com estado e funções para controlar o formulário
 */
export function useFormState<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : '') : value
    }));
    
    // Limpar erro quando o campo é alterado
    if (errors[name as keyof T]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    setValue,
    setValues,
    setErrors,
    reset
  };
}