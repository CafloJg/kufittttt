import { useState, useCallback } from 'react';
import { formatErrorMessage, categorizeError } from '../utils/errorUtils';
import { reportError } from '../utils/errorReporting';
import { FirebaseError } from 'firebase/app';
import { NetworkStatus } from '../utils/network';

/**
 * Custom hook for standardized error handling across the application
 */
export function useErrorHandling() {
  const [error, setErrorState] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [errorContext, setErrorContext] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const networkStatus = NetworkStatus.getInstance();

  // Tipo para as opções de erro
  type ErrorOptions = {
    context?: string;
    isNetworkError?: boolean;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    shouldReport?: boolean;
  };

  /**
   * Set an error with proper formatting and categorization
   */
  const setError = useCallback((error: unknown, options?: ErrorOptions) => {
    if (!error) {
      setErrorState(null);
      setErrorContext(null);
      setIsNetworkError(false);
      return;
    }
    
    // Format the error message for user display
    const errorMessage = formatErrorMessage(error);
    
    // Check if it's a network error
    const isOffline = !networkStatus.isOnline();
    const isNetworkErr = 
      isOffline || 
      options?.isNetworkError || 
      (typeof errorMessage === 'string' && 
        (errorMessage.toLowerCase().includes('network') || 
         errorMessage.toLowerCase().includes('internet') ||
         errorMessage.toLowerCase().includes('connection') ||
         errorMessage.toLowerCase().includes('offline')));
    
    setIsNetworkError(isNetworkErr);
    setErrorState(errorMessage);
    setErrorContext(options?.context || null);
    
    // Log error for debugging
    console.error('Error handled:', {
      error,
      message: errorMessage,
      context: options?.context,
      isNetworkError: isNetworkErr
    });
    
    // Report error to monitoring service if needed
    if (options?.shouldReport !== false && 
        (options?.severity === 'error' || options?.severity === 'critical')) {
      reportError(error, {
        context: options?.context,
        userId: localStorage.getItem('userId') || undefined,
        severity: options?.severity
      });
    }
  }, [networkStatus]);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorState(null);
    setErrorContext(null);
    setIsNetworkError(false);
    setLastError(null);
    setRetryCount(0);
  }, []);

  /**
   * Execute an async function with error handling
   */
  const withErrorHandling = useCallback(async <T,>(
    fn: () => Promise<T>,
    options?: {
      context?: string;
      retries?: number;
      onRetry?: () => void;
      severity?: 'info' | 'warning' | 'error' | 'critical';
      shouldReport?: boolean;
    }
  ): Promise<T | null> => {
    const retries = options?.retries || 0;
    let currentRetry = 0;
    
    // Simple network check using navigator.onLine
    if (!navigator.onLine) {
      setError('Você está offline. Verifique sua conexão.', {
        isNetworkError: true,
        context: options?.context,
        severity: 'warning'
      });
      return null;
    }
    
    const executeWithRetry = async (): Promise<T | null> => {
      try {
        setIsRetrying(currentRetry > 0);
        clearError();
        
        // Wrap the function call in a try-catch to handle specific errors
        try {
          return await fn();
        } catch (innerError) {
          // Handle specific error types
          if (innerError instanceof Error) {
            // Skip retries for Firebase internal errors
            if (innerError.message.includes('INTERNAL ASSERTION FAILED')) {
              console.warn('Skipping retry for Firestore internal assertion error:', innerError.message);
              throw innerError;
            }
            
            // Skip retries for offline errors
            if (innerError.message.includes('offline') || innerError.message.includes('client is offline')) {
              console.warn('Skipping retry for offline error:', innerError.message);
              throw innerError;
            }
          }
          
          throw innerError;
        }
      } catch (error) {
        // If we have retries left, try again with exponential backoff
        if (currentRetry < retries) {
          currentRetry++;
          console.log(`Retrying operation (${currentRetry}/${retries})...`);
          
          // Call onRetry callback if provided
          if (options?.onRetry) {
            options.onRetry();
          }
          
          // Add exponential backoff
          const delay = 1000 * Math.pow(2, currentRetry - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry();
        }
        
        // No more retries, handle the error
        setError(error, {
          context: options?.context,
          severity: options?.severity,
          shouldReport: options?.shouldReport
        });
        return null;
      } finally {
        setIsRetrying(false);
      }
    };
    
    return executeWithRetry();
  }, [clearError, setError]);

  // Function to retry a failed operation
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    let currentRetry = 0;
    let lastError: any = null;
    
    // Check network status before retrying
    const isOnline = await networkStatus.checkNetworkStatus();
    if (!isOnline) {
      throw new Error('Você está offline. Verifique sua conexão.');
    }
    
    while (currentRetry <= maxRetries) {
      try {
        setIsRetrying(currentRetry > 0);
        setRetryCount(currentRetry);
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry based on error type
        const { retryable } = categorizeError(error);
        if (!retryable || currentRetry >= maxRetries) {
          // Skip retries for Firebase internal errors
          if (error instanceof Error) {
            if (error.message.includes('INTERNAL ASSERTION FAILED')) {
              console.warn('Skipping retry for Firestore internal assertion error:', error.message);
              break;
            }
            
            if (error instanceof FirebaseError && error.code === 'unavailable') {
              console.warn('Skipping retry for Firebase unavailable error:', error.message);
              break;
            }
          } 
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
    setIsRetrying(false);
    
    // Update error state with retry information
    setError(lastError, {
      retryCount: currentRetry,
      maxRetries
    });
    
    throw lastError;
  }, [setError]);

  return {
    error,
    isNetworkError,
    isRetrying,
    retryCount,
    lastError,
    setError,
    clearError,
    withErrorHandling,
    retryOperation,
    errorContext
  };
}