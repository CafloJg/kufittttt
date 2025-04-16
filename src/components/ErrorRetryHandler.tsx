import React, { useState, useEffect } from 'react';
import { useError } from '../context/ErrorContext';
import { ErrorFallback } from './common/ErrorFallback';
import { NetworkStatus } from '../utils/network';

interface ErrorRetryHandlerProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  operation: () => Promise<any>;
  dependencies?: any[];
  maxRetries?: number;
  context?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

/**
 * Componente que tenta executar uma operação assíncrona e exibe um fallback em caso de erro
 * Implementa retry automático com backoff exponencial
 */
export function ErrorRetryHandler({
  children,
  fallbackComponent,
  operation,
  dependencies = [],
  maxRetries = 3,
  context = 'Ocorreu um erro',
  showHomeButton = true,
  showBackButton = false
}: ErrorRetryHandlerProps) {
  const { withErrorHandling, error, lastError, clearError } = useError();
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const networkStatus = NetworkStatus.getInstance();
  
  // Function to execute the operation
  const executeOperation = async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    setIsOffline(false);
    
    try {
      await withErrorHandling(operation, {
        context,
        retries: maxRetries,
        onRetry: () => {
          setRetryCount(prev => prev + 1);
        }
      });
      
      setHasError(false);
    } catch (err) {
      setHasError(true);
      
      // Check if it's a network error
      if (err instanceof Error && 
          (err.message.includes('offline') || 
           err.message.includes('network') ||
           err.message.includes('internet') ||
           err.message.includes('connection'))) {
        setIsOffline(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor network status
  useEffect(() => {
    const handleStatusChange = (online: boolean) => {
      setIsOffline(!online);
      
      // If we're back online and had an error, retry the operation
      if (online && hasError && retryCount < maxRetries) {
        executeOperation();
      }
    };
    
    const unsubscribe = networkStatus.addListener(handleStatusChange);
    
    return () => {
      unsubscribe();
    };
  }, [hasError, retryCount, maxRetries, executeOperation]);

  // Execute operation when component mounts or dependencies change
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      executeOperation();
    }
    
    return () => {
      isMounted = false;
    };
  }, [...dependencies, isOffline, executeOperation]);

  // Função para tentar novamente
  const handleRetry = () => {
    clearError();
    setRetryCount(0);
    setHasError(false);
    setIsOffline(false);
    
    // Re-execute the operation
    executeOperation();
  };

  // Se houver erro, exibe o fallback
  if (hasError || error || isOffline) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <ErrorFallback
        error={lastError || new Error(error || 'Ocorreu um erro desconhecido')}
        resetErrorBoundary={handleRetry}
        context={context}
        showHomeButton={showHomeButton}
        showBackButton={showBackButton}
        retryCount={retryCount}
        maxRetries={maxRetries}
        isNetworkError={isOffline}
      />
    );
  }

  // Se estiver carregando, exibe um indicador de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não houver erro, exibe os filhos
  return <>{children}</>;
}