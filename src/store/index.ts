import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createUserSlice, type UserSlice } from './slices/userSlice';
import { createDietSlice, type DietSlice } from './slices/dietSlice';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { StateStorage } from 'zustand/middleware';

export type RootState = {
  isLoading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
} & UserSlice & DietSlice & AuthSlice;

// Custom storage with error handling
const storage: StateStorage = {
  getItem: (name): string | null => {
    try {
      const value = localStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.warn('Error reading from localStorage:', err);
      return null;
    }
  },
  setItem: (name, value): void => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (err) {
      console.warn('Error writing to localStorage:', err);
    }
  },
  removeItem: (name): void => {
    try {
      localStorage.removeItem(name);
    } catch (err) {
      console.warn('Error removing from localStorage:', err);
    }
  }
};

export const useStore = create<RootState>()(
  devtools(
    persist(
      immer((set) => ({
        isLoading: false,
        error: null,
        setLoading: (isLoading: boolean) => set({ isLoading }),
        setError: (error: string | null) => set({ error }),
        ...createUserSlice(set),
        ...createDietSlice(set),
        ...createAuthSlice(set),
      })),
      {
        name: 'kiifit-store',
        partialize: (state) => ({
          user: state.user ? {
            uid: state.user.uid,
            email: state.user.email,
            subscriptionTier: state.user.subscriptionTier,
            completedOnboarding: state.user.completedOnboarding
          } : null,
          auth: {
            isAuthenticated: state.auth?.isAuthenticated ?? false
          }
        }),
        storage: createJSONStorage(() => storage)
      }
    )
  )
);