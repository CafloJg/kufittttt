import { goalService } from '../lib/services/goalService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../lib/firebase';
import type { CustomGoal, UserProfile } from '../types/user';

export function useGoals() {
  const queryClient = useQueryClient();

  const goals = useQuery({
    queryKey: ['goals', auth.currentUser?.uid],
    queryFn: () => auth.currentUser ? goalService.getUserGoals(auth.currentUser.uid) : null,
    enabled: !!auth.currentUser
  });

  const categories = useQuery({
    queryKey: ['goalCategories'],
    queryFn: () => goalService.getGoalCategories()
  });

  const templates = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: () => goalService.getGoalTemplates()
  });

  const suggestions = useQuery({
    queryKey: ['goalSuggestions', auth.currentUser?.uid],
    queryFn: () => auth.currentUser ? goalService.getSuggestedGoals(auth.currentUser.uid) : null,
    enabled: !!auth.currentUser
  });

  const createGoalMutation = useMutation({
    mutationFn: (goal: Omit<CustomGoal, 'id'>) => 
      auth.currentUser ? goalService.createGoal(auth.currentUser.uid, goal) : Promise.reject('Not authenticated'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalSuggestions'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ 
      goalId, 
      value, 
      notes, 
      mood 
    }: { 
      goalId: string; 
      value: number; 
      notes?: string;
      mood?: 'great' | 'good' | 'okay' | 'bad';
    }) => auth.currentUser 
      ? goalService.updateGoalProgress(auth.currentUser.uid, goalId, value, notes, mood)
      : Promise.reject('Not authenticated'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  return {
    goals,
    categories,
    templates,
    suggestions,
    createGoal: createGoalMutation.mutateAsync,
    updateProgress: updateProgressMutation.mutateAsync,
    isLoading: goals.isLoading || categories.isLoading || templates.isLoading,
    error: goals.error || categories.error || templates.error
  };
}

function calculateProgress(goal: CustomGoal, newValue: number): number {
  const today = new Date().toISOString().split('T')[0];
  const checkIns = Object.values(goal.checkIns);
  const totalValue = checkIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
  
  // Special handling for weight goals
  if (goal.type === 'weight' && goal.metadata) {
    const { startValue, targetValue } = goal.metadata;
    
    if (startValue !== undefined && targetValue !== undefined) {
      // Calculate progress based on direction (loss or gain)
      const isWeightLoss = targetValue < startValue;
      const totalChange = Math.abs(targetValue - startValue);
      
      // Use the new value as current weight
      const currentChange = isWeightLoss 
        ? Math.max(0, startValue - newValue)  // For weight loss
        : Math.max(0, newValue - startValue); // For weight gain
      
      // Calculate progress percentage (0-100)
      if (totalChange > 0) {
        return Math.min((currentChange / totalChange) * 100, 100);
      }
    }
  }
  
  switch (goal.frequency) {
    case 'daily':
      return Math.min((newValue / goal.target) * 100, 100);
    
    case 'weekly': {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekCheckIns = checkIns.filter(checkIn => 
        new Date(checkIn.timestamp) >= weekStart
      );
      const weekTotal = weekCheckIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
      return Math.min((weekTotal / goal.target) * 100, 100);
    }
    
    case 'monthly': {
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthCheckIns = checkIns.filter(checkIn =>
        new Date(checkIn.timestamp) >= monthStart
      );
      const monthTotal = monthCheckIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
      return Math.min((monthTotal / goal.target) * 100, 100);
    }
    
    default:
      return Math.min((totalValue / goal.target) * 100, 100);
  }
}