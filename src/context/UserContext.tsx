import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../types/user';
import { NetworkStatus } from '../utils/network';
import { useRef } from 'react';

interface UserContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<UserProfile | null>;
  isAuthLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const refreshInProgressRef = useRef(false);
  const networkStatus = NetworkStatus.getInstance();

  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check network status
      if (!navigator.onLine) {
        setError('Aplicativo está offline. Os dados do usuário não puderam ser carregados.');
        setIsLoading(false);
        return null;
      }

      // Use try-catch with retry logic for the Firestore operation
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
            const userData = userDoc.data() as UserProfile;
            setUser(userData);
            return userData;
          } else {
            setError('Perfil não encontrado');
            setUser(null);
            return null;
          }
        } catch (fetchError) {
          retryCount++;
          console.warn(`Error fetching user data (attempt ${retryCount}/${maxRetries}):`, fetchError);
          
          if (fetchError instanceof Error && 
              (fetchError.message.includes('offline') || 
               fetchError.message.includes('client is offline'))) {
            setError('Aplicativo está offline. Os dados do usuário não puderam ser carregados.');
            setUser(null);
            return null;
          }
          
          if (retryCount > maxRetries) {
            throw fetchError;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do usuário');
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const refreshUserData = useCallback(async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;

    if (refreshInProgressRef.current) {
      console.log('Refresh already in progress, skipping');
      return user;
    }
    
    if (!navigator.onLine) {
      console.warn('Cannot refresh user data while offline');
      return null;
    }

    try {
      refreshInProgressRef.current = true;
      const userData = await loadUserData(auth.currentUser.uid);
      
      if (userData) {
        setUser({
          ...userData,
          refreshUserData
        });
      }
      
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error instanceof Error ? error.message : error);
      return null;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      setIsAuthLoading(true);
      
      if (authUser) {
        try {
          const userData = await loadUserData(authUser.uid);
          if (userData) {
            setUser({
              ...userData,
              refreshUserData
            });
          }
        } catch (error) {
          console.error('Error loading user data on auth state change:', error);
        } finally {
          setIsAuthLoading(false);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setError(null);
        setIsAuthLoading(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUserData, isAuthLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}