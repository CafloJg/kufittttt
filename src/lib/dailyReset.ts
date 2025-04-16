import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { isSameDay } from './dietGenerator';
import { updateGoalFromDiet } from '../lib/firebase/goals'; 
import { Timestamp, arrayUnion, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '../types/user';

    // Reset daily stats
    const resetStats = {
       ...DEFAULT_DAILY_STATS,
      // Create a safe structure for completedMeals
      completedMeals: (() => {
        // Get today's date
        const today = now.toDate().toISOString().split('T')[0];
        
        // Initialize with an empty object
        const meals: Record<string, string[]> = {};
        
        // Preserve existing meals from other days, if they exist
        if (userData.dailyStats?.completedMeals) {
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
      }
    };

    const userData = userDoc.data() as UserProfile;
    // Create a proper Date object instead of using Timestamp directly
    const nowTimestamp = Timestamp.now();
    const now = nowTimestamp.toDate(); // Use a fresh Date object for consistency
    const today = now.toISOString().split('T')[0]; // Use Date's toISOString directly

    // Get last reset date with time set to midnight
    const lastReset = userData.lastDietReset ? Timestamp.fromDate(new Date(userData.lastDietReset)) : null;
    if (lastReset) {
      const lastResetDate = lastReset.toDate();
      lastResetDate.setHours(0, 0, 0, 0);

      // Check if already reset today
      if (lastReset.toDate().getDate() === now.getDate() &&
          lastReset.toDate().getMonth() === now.getMonth() &&
          lastReset.toDate().getFullYear() === now.getFullYear()) {
        console.log('Already reset today');
        return;
      }
    }

    console.log('Daily stats reset successfully');

    if (userData?.lastCheckIn) {
      // Only perform auto check-in if explicitly enabled by the user
      if (userData.autoCheckIn === true) {
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
    }
  } catch (error) {