import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorToast } from '../components/ErrorToast';
import { NetworkStatus } from '../utils/network';
import { reportError } from '../utils/errorReporting';
import { categorizeError } from '../utils/errorUtils';

interface ErrorContextType {
  setError: (error: Error | string | null, options?: ErrorOptions) => void;
  clearError: () => void;
  withErrorHandling: <T>(fn: () => Promise<T>, options?: ErrorOptions) => Promise<T | null>;
  isNetworkError: boolean;
  errorContext: string | null;
  lastError: Error | null;
  retryOperation: (operation: () => Promise<any>) => Promise<any>;
}

interface ErrorOptions {
  isNetworkError?: boolean;
  context?: string;
  retry?: () => void;
  autoClose?: boolean;
  duration?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  shouldReport?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<string | null>(null);
  const [options, setOptions] = useState<ErrorOptions>({});
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [errorContext, setErrorContext] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const networkStatus = NetworkStatus.getInstance();

  const setError = useCallback((error: Error | string | null | unknown, newOptions: ErrorOptions = {}) => {
    if (error === null) {
      setErrorState(null);
      setErrorContext(null);
      setLastError(null);
      setRetryCount(0);
      return;
    }
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorObject = typeof error === 'string' ? new Error(error) : 
                        error instanceof Error ? error : new Error(String(error));
    
    // Store the actual Error object
    setLastError(errorObject);
    
    // Check if it's a network error
    const isOffline = !networkStatus.isOnline();
    const isNetworkErr = 
      isOffline || 
      newOptions.isNetworkError || 
      (errorMessage && typeof errorMessage === 'string' && 
        (errorMessage.toLowerCase().includes('network') || 
         errorMessage.toLowerCase().includes('internet') ||
         errorMessage.toLowerCase().includes('connection') ||
         errorMessage.toLowerCase().includes('offline') ||
         errorMessage.toLowerCase().includes('client is offline')));
    
    setIsNetworkError(isNetworkErr);
    setErrorState(errorMessage);
    setOptions(newOptions);
    setErrorContext(newOptions.context || null);
    
    // Update retry count if provided
    if (newOptions.retryCount !== undefined) {
      setRetryCount(newOptions.retryCount);
    }
    
    // Log error for debugging
    console.error('Error handled:', {
      error,
      message: errorMessage,
      context: newOptions.context,
      isNetworkError: isNetworkErr,
      retryCount: newOptions.retryCount || retryCount
    });
    
    // Report error to monitoring service if needed
    if (newOptions.shouldReport !== false && 
        (newOptions.severity === 'error' || newOptions.severity === 'critical')) {
      reportError(error, {
        context: newOptions.context,
        userId: localStorage.getItem('userId') || undefined,
        severity: newOptions.severity,
        retryCount: newOptions.retryCount || retryCount,
        maxRetries: newOptions.maxRetries || 3
      });
    }
  }, [networkStatus, retryCount]);

  const clearError = useCallback(() => {
    setErrorState(null);
    setErrorContext(null);
    setIsNetworkError(false);
    setLastError(null);
    setRetryCount(0);
  }, []);

  const withErrorHandling = useCallback(async <T,>(
    fn: () => Promise<T>,
    newOptions: ErrorOptions = {
      retryCount: 0,
      maxRetries: 3
    }
  ): Promise<T | null> => {
    try {
      clearError();
      const result = await fn();
      return result;
    } catch (error) {
      // Categorize the error for specific handling
      const { type, isCritical, retryable, message } = categorizeError(error);
      
      // Handle critical errors specially
      if (isCritical) {
        // For example, redirect to login for auth errors
        if (type === 'auth') {
          window.location.href = '/login';
        }
      }
      
      // Update retry count
      const currentRetryCount = newOptions.retryCount || 0;
      
      setError(error instanceof Error ? error : String(error), {
        ...newOptions,
        retryCount: currentRetryCount,
        severity: isCritical ? 'critical' : newOptions.severity || 'error'
      });
      
      return null;
    }
  }, [clearError, setError]);

  // Function to retry an operation with exponential backoff
  const retryOperation = useCallback(async (operation: () => Promise<any>, maxRetries = 3) => {
    let currentRetry = 0;
    let lastError = null;
    
    while (currentRetry <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        const { retryable } = categorizeError(error);
        if (!retryable || currentRetry >= maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, currentRetry) * 1000 + Math.random() * 1000;
        console.log(`Retry ${currentRetry + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        currentRetry++;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }, []);

  return (
    <ErrorContext.Provider value={{ 
      setError, 
      clearError, 
      withErrorHandling, 
      isNetworkError,
      errorContext,
      lastError,
      retryOperation
    }}>
      {children}
      <ErrorToast
        message={error || ''}
        isVisible={!!error}
        onClose={clearError}
        isNetworkError={isNetworkError}
        onRetry={options.retry}
        autoClose={options.autoClose !== false}
        duration={options.duration}
        severity={options.severity}
      />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}