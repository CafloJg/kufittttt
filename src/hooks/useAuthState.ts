import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { useStore } from '../store';

export function useAuthState() {
  const { auth: { isAuthenticated }, setAuthenticated } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setAuthenticated]);

  return { isAuthenticated, isLoading };
}