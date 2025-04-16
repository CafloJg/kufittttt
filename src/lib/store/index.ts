import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createUserSlice, type UserSlice } from './slices/userSlice';
import { createDietSlice, type DietSlice } from './slices/dietSlice';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';

export type RootState = {
  isLoading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
} & UserSlice & DietSlice & AuthSlice;

export const useStore = create<RootState>()(
  devtools(
    persist(
      immer((...a) => ({
        isLoading: false,
        error: null,
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },
        setError: (error: string | null) => {
          set({ error });
        },
        ...createUserSlice(...a),
        ...createDietSlice(...a),
        ...createAuthSlice(...a),
      })),
      {
        name: 'kiifit-store',
        partialize: (state) => ({
          user: {
            uid: state.user?.uid,
            email: state.user?.email,
            subscriptionTier: state.user?.subscriptionTier,
            completedOnboarding: state.user?.completedOnboarding
          },
          auth: {
            isAuthenticated: state.auth.isAuthenticated
          }
        }),
        storage: createJSONStorage(() => ({
          getItem: (name) => {
            const data = localStorage.getItem(name);
            return data ? JSON.parse(data) : null;
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => localStorage.removeItem(name)
        }))
      }
    )
  )
);