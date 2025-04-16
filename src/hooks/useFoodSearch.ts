import { useQuery } from '@tanstack/react-query';
import { FoodService } from '../lib/services/foodService';
import type { Food } from '../types/food';

interface UseFoodSearchParams {
  query?: string;
  category?: string;
  dietType?: string;
  tags?: string[];
  minProtein?: number;
  maxCalories?: number;
  enabled?: boolean;
}

export function useFoodSearch({
  query,
  category,
  dietType,
  tags,
  minProtein,
  maxCalories,
  enabled = true
}: UseFoodSearchParams) {
  const foodService = FoodService.getInstance();

  return useQuery<Food[]>({
    queryKey: ['foods', { query, category, dietType, tags, minProtein, maxCalories }],
    queryFn: () => foodService.searchFoods({
      query,
      category,
      dietType,
      tags,
      minProtein,
      maxCalories
    }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000)
  });
}