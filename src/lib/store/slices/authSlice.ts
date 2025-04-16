import { StateCreator } from 'zustand';
import { RootState } from '..';

export interface AuthSlice {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const createAuthSlice: StateCreator<RootState, [], [], AuthSlice> = (set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
});