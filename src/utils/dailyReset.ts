import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { isSameDay } from './dietGenerator';
import { updateGoalFromDiet } from '../lib/firebase/goals'; 
import { Timestamp, arrayUnion } from 'firebase/firestore';
import type { UserProfile, CustomGoal } from '../types/user';

const DEFAULT_DAILY_STATS = {
  caloriesConsumed: 0,
  proteinConsumed: 0,
  carbsConsumed: 0,
  fatConsumed: 0,
  waterIntake: 0,
  completedMeals: {}
};

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
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    const lastCheckInString = userData.dailyStreak?.lastCheckIn;
    const lastCheckInDate = lastCheckInString ? new Date(lastCheckInString) : null;

    let alreadyProcessedToday = false;
    if (lastCheckInDate && isSameDay(lastCheckInDate, now)) {
      alreadyProcessedToday = true;
      console.log('Daily stats reset and check-in already processed today.');
      return;
    }

    console.log('Resetting daily stats...');
    let updatedGoals: CustomGoal[] = [];
    const customGoals = userData.goals?.customGoals || [];
    updatedGoals = customGoals.map(goal => {
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

    const resetStats = {
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      waterIntake: 0,
      completedMeals: { [todayISO]: [] },
      macroDistribution: { protein: 0, carbs: 0, fat: 0 },
      lastUpdated: now.toISOString()
    };
    
    console.log('Performing daily check-in...');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const isStreak = lastCheckInDate ? isSameDay(lastCheckInDate, yesterday) : false;
    const currentStreak = userData.dailyStreak?.currentStreak || 0;
    const newStreak = isStreak ? currentStreak + 1 : 1;
    
    let coinsReward = 10;
    if (newStreak >= 30) coinsReward += 20;
    else if (newStreak >= 7) coinsReward += 10;
    else if (newStreak >= 3) coinsReward += 5;
    
    const currentCoins = userData.kiiCoins?.balance || 0;
    const transactionId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const updateData: Record<string, any> = {
      dailyStats: resetStats,
      'goals.customGoals': updatedGoals,
      lastCheckIn: now.toISOString(),
      'dailyStreak.lastCheckIn': now.toISOString(),
      'dailyStreak.currentStreak': newStreak,
      'kiiCoins.balance': currentCoins + coinsReward,
      'kiiCoins.transactions': arrayUnion({
        id: transactionId,
        amount: coinsReward,
        type: 'earned',
        source: 'check-in',
        description: `Check-in diário (${newStreak} dias seguidos)`,
        timestamp: now.toISOString()
      }),
      'kiiCoins.lastUpdated': now.toISOString(),
      lastUpdated: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await updateDoc(userRef, updateData);
    console.log('Daily stats reset and check-in successful. Streak:', newStreak, 'Reward:', coinsReward);

  } catch (error) {
    console.error('Error in resetDailyStats process:', error);
    throw error; 
  }
}