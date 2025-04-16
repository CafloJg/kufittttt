import { useCallback } from 'react';
import { useStore } from '../store';
import { DietRepository } from '../lib/repositories/dietRepository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DietPlan } from '../types/user';

export function useDiet(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { setCurrentPlan, setError } = useStore();
  const dietRepo = DietRepository.getInstance();

  const { data: currentPlan, refetch: refetchCurrentPlan, isLoading: isLoadingPlan, isError } = useQuery({
    queryKey: ['diet', 'current', userId || 'anonymous'],
    queryFn: async () => {
      console.log(`Fetching current plan for user: ${userId || 'anonymous'}`);
      if (!userId) return null;
      
      // Check if online before trying to fetch
      if (!navigator.onLine) {
        console.warn('Cannot fetch diet plan while offline');
        return null;
      }
      
      try {
        return userId ? await dietRepo.getCurrentPlan(userId) : null;
      } catch (error) {
        // Skip Firestore internal assertion errors
        if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
          console.warn('Ignoring Firestore internal assertion error in diet query:', error.message);
          return null;
        }
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5000, // 5 seconds - more frequent updates for better responsiveness
    refetchOnWindowFocus: true, // Enable to ensure data is fresh when tab is focused
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchInterval: 10000, // 10 seconds - more frequent updates
    retry: (failureCount, error) => {
      // Don't retry on Firestore internal assertion errors
      if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  const { data: dietHistory } = useQuery({
    queryKey: ['diet', 'history', userId],
    queryFn: () => userId ? dietRepo.getDietHistory(userId) : [],
    enabled: !!userId && !isLoadingPlan,
    staleTime: 60000 // 60 seconds
  });

  const updatePlanMutation = useMutation({
    mutationFn: (plan: DietPlan) => 
      userId ? dietRepo.updateCurrentPlan(userId, plan) : Promise.reject('No user ID'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet'] });
    }
  });

  const updateCurrentPlan = useCallback(async (plan: DietPlan) => {
    try {
      if (!userId) throw new Error('User not authenticated');
      
      // Check if online before proceeding
      if (!navigator.onLine) {
        throw new Error('Você está offline. Verifique sua conexão com a internet e tente novamente.');
      }
      
      console.log(`Updating current plan in useDiet: ${plan.id}`, JSON.stringify(plan.dailyStats));
      
      // Ensure dailyStats is properly structured before updating
      if (!plan.dailyStats) {
        plan.dailyStats = {
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          waterIntake: 0,
          completedMeals: { [new Date().toISOString().split('T')[0]]: [] },
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Update the cache immediately for instant UI feedback
      queryClient.setQueryData(['diet', 'current', userId], (oldData: any) => {
        // If we have old data, ensure we're not overwriting any fields we didn't update
        if (oldData) {
          // console.log('Updating cache with new values:', {
          //   oldCalories: oldData.dailyStats?.caloriesConsumed,
          //   newCalories: plan.dailyStats?.caloriesConsumed
          // });
          
          return {
            ...oldData,
            ...plan,
            dailyStats: {
              ...plan.dailyStats,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return plan;
      });
      
      // Then invalidate to trigger background refresh
      // Use a small delay to avoid race conditions
      setTimeout(() => {
        // Invalidate all related queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['diet'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        
        // Force an immediate refetch
        refetchCurrentPlan().catch(console.error);
      }, 500);
      
      console.log('Diet cache updated and queries invalidated');
      
      return plan;
    } catch (error) {
      console.error('Error updating plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to update plan');
      throw error;
    }
  }, [userId, updatePlanMutation, setCurrentPlan, setError]);

  return {
    currentPlan,
    dietHistory,
    isLoading: updatePlanMutation.isPending || isLoadingPlan,
    error: updatePlanMutation.error,
    updateCurrentPlan,
    refetchCurrentPlan
  };
}