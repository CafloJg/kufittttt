import { z } from 'zod';
import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, Achievement } from '../../types/user';

const achievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['onboarding', 'streak', 'nutrition', 'macros', 'special']),
  icon: z.string(),
  reward_coins: z.number(),
  progress: z.number().min(0).max(100),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  requirements: z.object({
    type: z.string(),
    target: z.number(),
    current: z.number()
  })
});

const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2100,   // Level 7
  2800,   // Level 8
  3600,   // Level 9
  4500    // Level 10
];

const calculateLevel = (experience: number): number => {
  return LEVEL_THRESHOLDS.findIndex(threshold => experience < threshold) || LEVEL_THRESHOLDS.length;
};

export class AchievementService {
  private static instance: AchievementService;

  private constructor() {}

  static getInstance(): AchievementService {
    if (!this.instance) {
      this.instance = new AchievementService();
    }
    return this.instance;
  }

  private getAvailableAchievements(user: UserProfile): Achievement[] {
    return [
      {
        id: 'first-checkin',
        title: 'Primeiro Check-in',
        description: 'Complete seu primeiro check-in diário',
        type: 'onboarding',
        icon: 'calendar',
        reward_coins: 10,
        progress: user.dailyStreak ? 100 : 0,
        completed: !!user.dailyStreak,
        requirements: {
          type: 'checkin',
          target: 1,
          current: user.dailyStreak ? 1 : 0
        }
      },
      {
        id: 'streak-7',
        title: 'Semana Perfeita',
        description: 'Complete 7 dias seguidos de check-in',
        type: 'streak',
        icon: 'calendar',
        reward_coins: 50,
        progress: ((user.dailyStreak?.currentStreak || 0) / 7) * 100,
        completed: (user.dailyStreak?.currentStreak || 0) >= 7,
        requirements: {
          type: 'streak',
          target: 7,
          current: user.dailyStreak?.currentStreak || 0
        }
      },
      {
        id: 'streak-30',
        title: 'Mês Consistente',
        description: 'Complete 30 dias de check-in',
        type: 'streak',
        icon: 'calendar',
        reward_coins: 200,
        progress: ((user.dailyStreak?.currentStreak || 0) / 30) * 100,
        completed: (user.dailyStreak?.currentStreak || 0) >= 30,
        requirements: {
          type: 'streak',
          target: 30,
          current: user.dailyStreak?.currentStreak || 0
        }
      },
      {
        id: 'explorer-20',
        title: 'Explorador Nutricional I',
        description: 'Experimente 20 alimentos diferentes',
        type: 'nutrition',
        icon: 'utensils',
        reward_coins: 30,
        progress: (this.getUniqueFoodsCount(user) / 20) * 100,
        completed: this.getUniqueFoodsCount(user) >= 20,
        requirements: {
          type: 'unique_foods',
          target: 20,
          current: this.getUniqueFoodsCount(user)
        }
      },
      {
        id: 'explorer-50',
        title: 'Explorador Nutricional II',
        description: 'Experimente 50 alimentos diferentes',
        type: 'nutrition',
        icon: 'utensils',
        reward_coins: 80,
        progress: (this.getUniqueFoodsCount(user) / 50) * 100,
        completed: this.getUniqueFoodsCount(user) >= 50,
        requirements: {
          type: 'unique_foods',
          target: 50,
          current: this.getUniqueFoodsCount(user)
        }
      },
      {
        id: 'macros-7',
        title: 'Mestre do Equilíbrio I',
        description: 'Atinja proporções ideais de macros por 7 dias',
        type: 'macros',
        icon: 'target',
        reward_coins: 70,
        progress: (this.getBalancedMacroDays(user) / 7) * 100,
        completed: this.getBalancedMacroDays(user) >= 7,
        requirements: {
          type: 'balanced_macros',
          target: 7,
          current: this.getBalancedMacroDays(user)
        }
      }
    ];
  }

  private getUniqueFoodsCount(user: UserProfile): number {
    const uniqueFoods = new Set<string>();
    
    // Add foods from current plan
    user.currentDietPlan?.meals.forEach(meal => {
      meal.foods.forEach(food => {
        uniqueFoods.add(food.name.toLowerCase());
      });
    });
    
    // Add foods from history
    user.dietHistory?.plans.forEach(plan => {
      plan.meals.forEach(meal => {
        meal.foods.forEach(food => {
          uniqueFoods.add(food.name.toLowerCase());
        });
      });
    });
    
    return uniqueFoods.size;
  }

  private getBalancedMacroDays(user: UserProfile): number {
    let balancedDays = 0;
    const today = new Date();
    const last30Days = new Date(today.setDate(today.getDate() - 30));
    
    user.dietHistory?.plans.forEach(plan => {
      const planDate = new Date(plan.date || plan.createdAt);
      if (planDate >= last30Days) {
        const stats = plan.dailyStats;
        if (stats) {
          const totalCalories = stats.caloriesConsumed;
          const proteinCals = stats.proteinConsumed * 4;
          const carbsCals = stats.carbsConsumed * 4;
          const fatCals = stats.fatConsumed * 9;
          
          // Check if macros are within ideal ranges
          const proteinRatio = proteinCals / totalCalories;
          const carbsRatio = carbsCals / totalCalories;
          const fatRatio = fatCals / totalCalories;
          
          if (
            proteinRatio >= 0.25 && proteinRatio <= 0.35 &&
            carbsRatio >= 0.45 && carbsRatio <= 0.55 &&
            fatRatio >= 0.20 && fatRatio <= 0.30
          ) {
            balancedDays++;
          }
        }
      }
    });
    
    return balancedDays;
  }

  private async awardAchievement(userId: string, achievement: Achievement): Promise<void> {
    const now = new Date().toISOString();
    const userRef = doc(db, 'users', userId);
    const transactionId = `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as UserProfile;
    const currentKiiCoins = userData.kiiCoins?.balance || 0;
    
    await updateDoc(userRef, {
      [`achievements.${achievement.id}`]: {
        ...achievement,
        completed: true,
        completedAt: now
      },
      'kiiCoins.balance': currentKiiCoins + achievement.reward_coins,
      'kiiCoins.transactions': arrayUnion({
        id: transactionId,
        amount: achievement.reward_coins,
        type: 'earned',
        source: 'achievement',
        description: `Conquista: ${achievement.title}`,
        timestamp: now
      }),
      'kiiCoins.lastUpdated': now,
      experience: increment(achievement.reward_coins),
      updatedAt: now
    });
  }

  async checkAchievements(user: UserProfile): Promise<Achievement[]> {
    try {
      const achievements = this.getAvailableAchievements(user);
      
      // Check for newly completed achievements
      const newlyCompleted = achievements.filter(achievement => {
        const wasCompleted = user.achievements?.[achievement.id]?.completed;
        return achievement.completed && !wasCompleted;
      });

      if (newlyCompleted.length > 0) {
        // Award achievements and update user stats
        await Promise.all(
          newlyCompleted.map(achievement => 
            this.awardAchievement(user.uid, achievement)
          )
        );
      }

      return achievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw new Error('Failed to check achievements');
    }
  }

  async getProgress(user: UserProfile): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    nextAchievement?: Achievement;
    level: number;
    experience: number;
    nextLevelThreshold: number;
  }> {
    try {
      const achievements = this.getAvailableAchievements(user);
      const completed = achievements.filter(a => a.completed).length;
      const inProgress = achievements.filter(a => !a.completed && a.progress > 0).length;
      
      // Find next achievement close to completion
      const nextAchievement = achievements
        .filter(a => !a.completed)
        .sort((a, b) => b.progress - a.progress)[0];

      // Calculate level and experience
      const experience = user.experience || 0;
      const level = calculateLevel(experience);
      const nextLevelThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

      return {
        total: achievements.length,
        completed,
        inProgress,
        nextAchievement,
        level,
        experience,
        nextLevelThreshold
      };
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      throw new Error('Failed to get achievement progress');
    }
  }
}