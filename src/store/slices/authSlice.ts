import { StateCreator } from 'zustand';
import { RootState } from '..';

export interface AuthSlice {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  };
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const createAuthSlice: StateCreator<RootState, [], [], AuthSlice> = (set) => ({
  auth: {
    isAuthenticated: false,
    isLoading: false,
    error: null
  },
  setAuthenticated: (isAuthenticated) => set((state) => ({
    auth: {
      ...state.auth,
      isAuthenticated,
      error: null
    }
  })),
  setLoading: (isLoading) => set((state) => ({
    auth: {
      ...state.auth,
      isLoading
    }
  })),
  setError: (error) => set((state) => ({
    auth: {
      ...state.auth,
      error
    }
  }))
});