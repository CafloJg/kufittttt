import { useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut
} from 'firebase/auth';
import { UserRepository } from '../lib/repositories/userRepository';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types/user';

export function useAuth() {
  const navigate = useNavigate();
  const { setAuthenticated, setLoading, setError, setUser, isLoading, error } = useStore(state => ({
    setAuthenticated: state.setAuthenticated,
    setLoading: state.setLoading,
    setError: state.setError,
    setUser: state.setUser,
    isLoading: state.isLoading,
    error: state.error
  }));
  const userRepo = UserRepository.getInstance();

  const handleSuccessfulLogin = useCallback(async (firebaseUser: any) => {
    let userProfile = await userRepo.getUser(firebaseUser.uid);

    if (!userProfile) {
      const newUserProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        subscriptionTier: 'basic', 
        subscriptionStatus: 'active',
        createdAt: new Date(),
        completedOnboarding: false, 
      };
      await userRepo.createUser(newUserProfile);
      userProfile = newUserProfile;
    }
    
    if (setUser) setUser(userProfile);
    setAuthenticated(true);
    if (userProfile) {
        navigate(userProfile.completedOnboarding ? '/dashboard' : '/onboarding');
    }
  }, [navigate, setAuthenticated, userRepo, setUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
      setAuthenticated(false);
      if (setUser) setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setAuthenticated, handleSuccessfulLogin, setUser]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut(auth);
      setAuthenticated(false);
      if (setUser) setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, [navigate, setAuthenticated, setError, setLoading, setUser, auth]);

  return { 
    signIn, 
    signOut, 
    isLoading,
    error,
    setError
  };
}