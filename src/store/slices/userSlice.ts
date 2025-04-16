import { StateCreator } from 'zustand';
import { RootState } from '..';
import { UserProfile } from '../../types/user';

export interface UserSlice {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  updateUser: (data: Partial<UserProfile>) => void;
  clearUser: () => void;
}

export const createUserSlice: StateCreator<RootState, [], [], UserSlice> = (set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),
  clearUser: () => set({ user: null }),
});