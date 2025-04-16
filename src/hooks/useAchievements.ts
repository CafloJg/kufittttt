import { useQuery } from '@tanstack/react-query';
import { AchievementService } from '../lib/services/achievementService';
import type { UserProfile } from '../types/user';

export function useAchievements(user: UserProfile) {
  const achievementService = AchievementService.getInstance();

  const achievements = useQuery({
    queryKey: ['achievements', user.uid],
    queryFn: () => achievementService.checkAchievements(user),
    enabled: !!user.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2
  });

  const progress = useQuery({
    queryKey: ['achievementProgress', user.uid],
    queryFn: () => achievementService.getProgress(user),
    enabled: !!user.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  return {
    achievements,
    progress,
    isLoading: achievements.isLoading || progress.isLoading,
    error: achievements.error || progress.error
  };
}