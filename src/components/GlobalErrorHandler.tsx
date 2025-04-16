import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import { NetworkStatus } from '../utils/network';
import { ErrorToast } from './ErrorToast';
import { reportError } from '../utils/errorReporting';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  const { error, setError } = useStore();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showError, setShowError] = React.useState(false);
  const [errorSeverity, setErrorSeverity] = React.useState<'info' | 'warning' | 'error' | 'critical'>('error');

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const networkStatus = NetworkStatus.getInstance();
    const unsubscribe = networkStatus.addListener(setIsOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Show error when it's set
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  // Handle global errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      
      // Report the error
      reportError(event.error, {
        context: 'Global unhandled error',
        severity: 'critical'
      });
      
      // Set error state
      setError(`Erro inesperado: ${event.message}`);
      setErrorSeverity('critical');
      
      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Report the error
      reportError(event.reason, {
        context: 'Unhandled promise rejection',
        severity: 'critical'
      });
      
      // Set error state
      setError(`Promessa rejeitada: ${event.reason?.message || 'Erro desconhecido'}`);
      setErrorSeverity('critical');
      
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [setError]);

  if (!showError) return <>{children}</>;

  return (
    <>
      {children}
      
      {/* Global Error Toast */}
      <ErrorToast
        message={error || ''}
        isVisible={showError && !!error}
        onClose={() => {
          setShowError(false);
          setError(null);
        }}
        isNetworkError={!isOnline}
        autoClose={true}
        duration={8000}
        severity={errorSeverity}
      />
    </>
  );
}

// Add this to your CSS
const styles = `
@keyframes shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
`;

// Add the styles to the document
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);