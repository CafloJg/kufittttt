import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import App from './App';
import { FirebaseError } from 'firebase/app';
import './index.css';
import './font-fix.css';

// Configuração global para tratamento de erros não capturados
window.addEventListener('error', (event) => {
  // Skip Firestore internal assertion errors
  if (event.error && 
      event.error.message && 
      event.error.message.includes('INTERNAL ASSERTION FAILED')) {
    console.warn('Ignoring Firestore internal assertion error:', event.error.message);
    event.preventDefault();
    return;
  }
  
  // Skip Firestore offline errors
  if (event.error && 
      event.error.message && 
      (event.error.message.includes('offline') || 
       event.error.message.includes('client is offline'))) {
    console.warn('Ignoring Firestore offline error:', event.error.message);
    event.preventDefault();
    return;
  }
  
  console.error('Uncaught error:', event.error);
  // Aqui você poderia enviar o erro para um serviço de monitoramento
});

window.addEventListener('unhandledrejection', (event) => {
  // Skip Firestore internal assertion errors
  if (event.reason && 
      event.reason.message && 
      event.reason.message.includes('INTERNAL ASSERTION FAILED')) {
    console.warn('Ignoring Firestore internal assertion error in promise:', event.reason.message);
    event.preventDefault();
    return;
  }
  
  // Skip Firestore offline errors
  if (event.reason && 
      event.reason.message && 
      (event.reason.message.includes('offline') || 
       event.reason.message.includes('client is offline'))) {
    console.warn('Ignoring Firestore offline error in promise:', event.reason.message);
    event.preventDefault();
    return;
  }
  
  console.error('Unhandled promise rejection:', event.reason);
  // Aqui você poderia enviar o erro para um serviço de monitoramento
});

// Configuração do React Query com tratamento de erros global
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry for Firestore offline errors
        if (error instanceof FirebaseError && error.code === 'unavailable') {
          console.warn('Skipping retry for Firebase unavailable error:', error.message);
          return false;
        }
        
        // Don't retry for Firestore internal assertion errors
        if (error?.message?.includes('INTERNAL ASSERTION FAILED')) {
          console.warn('Skipping retry for Firestore internal assertion error');
          return false;
        }
        
        // Don't retry for 4xx errors
        if (error?.message?.includes('status code 4')) {
          return false;
        }
        
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * Math.pow(1.5, attemptIndex), 10000),
      onError: (error) => {
        // Skip logging for Firestore internal assertion errors
        if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
          console.warn('React Query error (Firestore internal assertion):', error.message);
          return;
        }
        
        // Skip logging for Firestore offline errors
        if (error instanceof FirebaseError && error.code === 'unavailable') {
          console.warn('React Query error (Firestore offline):', error.message);
          return;
        }
        
        if (error instanceof Error && 
            (error.message.includes('offline') || 
             error.message.includes('client is offline'))) {
          console.warn('React Query error (offline):', error.message);
          return;
        } else {
          console.error('React Query error:', error);
        }
      }
    }
  }
});

// Unregister any service workers to avoid network issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.unregister();
  }).catch(error => console.error('Service worker unregistration failed:', error));
}

// Configure React Query's online manager to use the browser's online/offline events
onlineManager.setEventListener(setOnline => {
  // Listen to online/offline events
  const onlineListener = () => setOnline(true);
  const offlineListener = () => setOnline(false);

  // Set initial online state
  setOnline(navigator.onLine);

  // Add event listeners
  window.addEventListener('online', onlineListener);
  window.addEventListener('offline', offlineListener);

  // Cleanup function
  return () => {
    window.removeEventListener('online', onlineListener);
    window.removeEventListener('offline', offlineListener);
  };
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);