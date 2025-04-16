import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NutritionService } from '../lib/services/nutritionService';
import type { Food } from '../types/food';
import type { UserProfile } from '../types/user';

export function useNutritionAnalysis(foods: Food[], enabled = true) {
  const nutritionService = NutritionService.getInstance();

  return useQuery({
    queryKey: ['nutritionAnalysis', foods.map(f => f.id)],
    queryFn: () => nutritionService.analyzeNutrition(foods),
    enabled: enabled && foods.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1
  });
}

export function usePersonalizedRecommendations(
  user: UserProfile,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  enabled = true
) {
  const nutritionService = NutritionService.getInstance();

  return useQuery({
    queryKey: ['mealRecommendations', user.uid, mealType],
    queryFn: () => nutritionService.getPersonalizedRecommendations(user, mealType),
    enabled: enabled && !!user.uid,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2
  });
}

export function useNutritionQA() {
  const nutritionService = NutritionService.getInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (question: string) => nutritionService.answerNutritionQuestion(question),
    onSuccess: (data, question) => {
      queryClient.setQueryData(['nutritionQA', question], data);
    }
  });
}

export function useMealPlanGeneration(user: UserProfile) {
  const nutritionService = NutritionService.getInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => nutritionService.generateMealPlan(user),
    onSuccess: (data) => {
      queryClient.setQueryData(['mealPlan', user.uid], data);
    }
  });
}