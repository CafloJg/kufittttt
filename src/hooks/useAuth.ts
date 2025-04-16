import { useCallback } from 'react';
import { useStore } from '../store';
import { auth } from '../lib/firebase';
import { UserRepository } from '../lib/repositories/userRepository';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();
  const { setAuthenticated, setLoading, setError } = useStore();
  const userRepo = UserRepository.getInstance();

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = await userRepo.getUser(userCredential.user.uid);
      
      if (!user) throw new Error('User not found');
      
      setAuthenticated(true);
      navigate(user.completedOnboarding ? '/dashboard' : '/onboarding');
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [navigate, setAuthenticated, setLoading, setError]);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
    }
  }, [navigate, setAuthenticated, setError]);

  return { signIn, signOut };
}