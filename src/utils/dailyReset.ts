import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { isSameDay } from './dietGenerator';
import { updateGoalFromDiet } from '../lib/firebase/goals'; 
import { Timestamp, arrayUnion } from 'firebase/firestore';
import type { UserProfile } from '../types/user';

const DEFAULT_DAILY_STATS = {
  caloriesConsumed: 0,
  proteinConsumed: 0,
  carbsConsumed: 0,
  fatConsumed: 0,
  waterIntake: 0,
  completedMeals: {}
};

async function archiveCurrentPlan(userId: string, userData: UserProfile) {
  try {
    if (!userData.currentDietPlan) return;
    
    // Ensure plan has required fields
    if (!userData.currentDietPlan.id || !userData.currentDietPlan.meals) {
      console.warn('Invalid plan structure:', userData.currentDietPlan);
      return;
    }
    
    const userRef = doc(db, 'users', userId);
    const today = new Date().toISOString().split('T')[0];

    // Create a clean plan object with only required fields
    const cleanPlan = {
      id: userData.currentDietPlan.id,
      userId: userId,
      date: today,
      meals: userData.currentDietPlan.meals,
      totalCalories: userData.currentDietPlan.totalCalories,
      proteinTarget: userData.currentDietPlan.proteinTarget,
      carbsTarget: userData.currentDietPlan.carbsTarget,
      fatTarget: userData.currentDietPlan.fatTarget,
      dailyStats: {
        ...DEFAULT_DAILY_STATS,
        completedMeals: { [today]: [] }
      }
    };

    // Get existing history or initialize new one
    const dietHistory = userData.dietHistory || {
      plans: [],
      lastUpdated: new Date().toISOString()
    };

    // Add new plan to history
    const updatedHistory = {
      plans: [...dietHistory.plans, cleanPlan],
      lastUpdated: new Date().toISOString()
    };

    await updateDoc(userRef, {
      dietHistory: updatedHistory
    });

  } catch (error) {
    console.error('Error archiving current plan:', error);
    throw error;
  }
}

export async function resetDailyStats(userId?: string) {
  if (!userId && !auth.currentUser) {
    console.warn('No authenticated user');
    throw new Error('Usuário não autenticado');
  }
  
  const uid = userId || auth.currentUser?.uid;
  if (!uid) throw new Error('ID do usuário não encontrado');
  
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    const userData = userDoc.data() as UserProfile;
    // Create a proper Date object instead of using Timestamp directly
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get last reset date with time set to midnight
    const lastReset = userData.lastDietReset ? new Date(userData.lastDietReset) : null;
    if (lastReset) {
      lastReset.setHours(0, 0, 0, 0);

      // Check if already reset today
      if (lastReset.getDate() === now.getDate() &&
          lastReset.getMonth() === now.getMonth() &&
          lastReset.getFullYear() === now.getFullYear()) {
        console.log('Already reset today');
        return;
      }
    }
    
    // Archive current plan before resetting
    let updatedGoals = [];
    
    if (userData.currentDietPlan) {
      await archiveCurrentPlan(uid, userData);
      const currentPlan = userData.currentDietPlan;
      
      // Initialize updatedGoals with current goals
      const customGoals = userData.goals?.customGoals || [];
      updatedGoals = customGoals.map(goal => {
        // Only reset progress for nutrition and hydration goals
        if (goal.type === 'nutrition' || goal.type === 'hydration') {
          return {
            ...goal,
            progress: 0,
            checkIns: {},
            status: 'active'
          };
        }
        return goal;
      });
      
      // Reset and update linked goals
      if (userData.dietGoals) {
        for (const [goalId, goal] of Object.entries(userData.dietGoals)) {
          if (goal.linkToDiet) {
            await updateGoalFromDiet(
              uid,
              currentPlan.id,
              goal.metricType,
              0 // Reset to 0 for new day
            );
          }
        }
      }
    }

    // Reset daily stats
    const resetStats = {
      ...DEFAULT_DAILY_STATS,
      // Create a safe structure for completedMeals
      completedMeals: (() => {
        // Get today's date
        const today = now.toISOString().split('T')[0];
        
        // Initialize with an empty object
        const meals: Record<string, string[]> = {};
        
        // Preserve existing meals from other days, if they exist
        if (userData.dailyStats && userData.dailyStats.completedMeals) {
          Object.entries(userData.dailyStats.completedMeals).forEach(([date, mealList]) => {
            if (date !== today) {
              meals[date] = Array.isArray(mealList) ? mealList : [];
            }
          });
        }
        
        // Add empty entry for today
        meals[today] = [];
        
        return meals;
      })(),
      macroDistribution: {
        protein: 0,
        carbs: 0,
        fat: 0
      },
      lastUpdated: new Date().toISOString()
    };

    // Make a deep copy of the current plan's dailyStats to avoid reference issues
    const currentPlanDailyStats = userData.currentDietPlan?.dailyStats 
      ? JSON.parse(JSON.stringify(userData.currentDietPlan.dailyStats))
      : null;

    // Prepare the update for the current plan's dailyStats
    const currentPlanDailyStatsUpdate = currentPlanDailyStats 
      ? {
          ...currentPlanDailyStats,
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          completedMeals: {
            ...(currentPlanDailyStats.completedMeals || {}),
            [today]: []
          },
          lastUpdated: now.toISOString()
        }
      : null;

    // Update user document with reset stats
    const updateData: Record<string, any> = {
      dailyStats: resetStats,
      lastUpdated: now.toISOString(),
      'goals.customGoals': updatedGoals,
      lastDietReset: now.toISOString()
    };

    // Add current plan dailyStats update if it exists
    if (currentPlanDailyStatsUpdate) {
      updateData['currentDietPlan.dailyStats'] = currentPlanDailyStatsUpdate;
    }

    await updateDoc(userRef, updateData);

    console.log('Daily stats reset successfully');

    if (userData?.lastCheckIn) {
      const lastCheckDate = new Date(userData.lastCheckIn);
      
      // If last check-in was not today, trigger auto check-in
      if (!isSameDay(lastCheckDate, now)) { // now is already a Date object
        
        // Calculate streak
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const isStreak = lastCheckDate.getTime() === yesterday.getTime();
        const newStreak = isStreak ? (userData.checkInStreak || 0) + 1 : 1;
        
        // Calculate reward based on streak
        let coinsReward = 10; // Base reward
        if (newStreak >= 30) coinsReward += 20;
        else if (newStreak >= 7) coinsReward += 10;
        else if (newStreak >= 3) coinsReward += 5;
        
        const currentCoins = userData.kiiCoins?.balance || 0;
        const transactionId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update user document with streak and reward
        await updateDoc(userRef, {
          lastCheckIn: now.toISOString(),
          checkInStreak: newStreak,
          updatedAt: new Date().toISOString(),
          lastDietReset: now.toISOString(),
          'kiiCoins.balance': currentCoins + coinsReward,
          'kiiCoins.transactions': arrayUnion({
            id: transactionId,
            amount: coinsReward,
            type: 'earned',
            source: 'check-in',
            description: `Check-in diário (${newStreak} dias seguidos)`, 
            timestamp: new Date().toISOString()
          }),
          'kiiCoins.lastUpdated': now.toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error resetting daily stats:', error);
    throw error;
  }
}