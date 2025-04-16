import { useEffect } from 'react';
import { useStore } from '../store';

export function useAppState() {
  const { setError } = useStore();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any stale errors when app becomes visible
        setError(null);
      }
    };

    const handleOnline = () => {
      setError(null);
    };

    const handleOffline = () => {
      setError('Você está offline. Algumas funcionalidades podem estar indisponíveis.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setError]);
}