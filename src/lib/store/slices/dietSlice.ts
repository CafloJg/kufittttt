import { StateCreator } from 'zustand';
import { RootState } from '..';
import { DietPlan } from '../../../types/user';

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
  setCurrentPlan: (plan) => {
    console.log(`Setting current plan in store: ${plan?.id || 'null'}`);
    set({ currentPlan: plan });
  },
  updateDietHistory: (plans) => set({ dietHistory: plans }),
  setGenerating: (isGenerating) => {
    console.log(`Setting generating state: ${isGenerating}`);
    set({ isGenerating });
    
    // If we're no longer generating, make sure we have the latest plan
    if (!isGenerating) {
      const currentState = set.getState();
      if (currentState.currentPlan) {
        console.log('Generation complete, current plan is available');
      } else {
        console.log('Generation complete, but no current plan is available');
      }
    }
  },
  setError: (error) => set({ error }),
});