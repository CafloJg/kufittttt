import { useQuery } from '@tanstack/react-query';
import { InsightsService } from '../lib/services/insightsService';
import type { UserProfile } from '../types/user';

export function useInsights(user: UserProfile) {
  const insightsService = InsightsService.getInstance();

  return useQuery({
    queryKey: ['insights', user.uid],
    queryFn: () => insightsService.generateDailyInsights(user),
    enabled: !!user.uid,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    retry: 2
  });
}