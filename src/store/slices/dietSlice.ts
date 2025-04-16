import { StateCreator } from 'zustand';
import { RootState } from '..';
import { DietPlan } from '../../types/user';

export interface DietSlice {
  currentPlan: DietPlan | null;
  dietHistory: DietPlan[];
  isGenerating: boolean;
  error: string | null;
  setCurrentPlan: (plan: DietPlan | null) => void;
  updateDietHistory: (plans: DietPlan[]) => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
}

export const createDietSlice: StateCreator<RootState, [], [], DietSlice> = (set) => ({
  currentPlan: null,
  dietHistory: [],
  isGenerating: false,
  error: null,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  updateDietHistory: (plans) => set({ dietHistory: plans }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
});