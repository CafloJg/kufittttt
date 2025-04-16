import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, CustomGoal } from '../../types/user';

// Collection references
const goalsCollection = collection(db, 'goals');
const goalMetricsCollection = collection(db, 'goal_metrics');
const goalNotificationsCollection = collection(db, 'goal_notifications');

// Helper to update goal progress from diet
export async function updateGoalFromDiet(
  userId: string,
  dietPlanId: string,
  metricType: 'protein' | 'calories' | 'meals',
  value: number
) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data() as UserProfile;
    const currentPlan = userData.currentDietPlan;
    const dietGoals = userData.dietGoals || {};
    
    // Update goals based on diet plan targets
    if (currentPlan && currentPlan.id === dietPlanId) {
      const customGoals = userData.goals?.customGoals || [];
      
      // Update protein goals
      const proteinGoals = customGoals.filter(g => 
        g.type === 'protein' && g.status === 'active'
      );
      
      for (const goal of proteinGoals) {
        if (currentPlan.proteinTarget !== goal.target) {
          await updateDoc(userRef, {
            [`goals.customGoals`]: customGoals.map(g =>
              g.id === goal.id ? {
                ...g,
                target: currentPlan.proteinTarget,
                updatedAt: new Date().toISOString()
              } : g
            )
          });
        }
      }
      
      // Update calorie goals
      const calorieGoals = customGoals.filter(g => 
        g.type === 'calories' && g.status === 'active'
      );
      
      for (const goal of calorieGoals) {
        if (currentPlan.totalCalories !== goal.target) {
          await updateDoc(userRef, {
            [`goals.customGoals`]: customGoals.map(g =>
              g.id === goal.id ? {
                ...g,
                target: currentPlan.totalCalories,
                updatedAt: new Date().toISOString()
              } : g
            )
          });
        }
      }
    }
    
    // Find goals linked to this diet plan
    const linkedGoals = Object.entries(dietGoals)
      .filter(([_, goal]) => goal.planId === dietPlanId && goal.autoUpdate)
      .map(([goalId, goal]) => ({
        goalId,
        ...goal
      }));
      
    // Update each linked goal
    for (const linkedGoal of linkedGoals) {
      if (linkedGoal.metricType !== metricType) continue;
      
      const goal = userData.goals?.customGoals?.find(g => g.id === linkedGoal.goalId);
      if (!goal) continue;
      
      const progress = Math.min((value / goal.target) * 100, 100);
      const isCompleted = progress >= 100;
      
      // Update goal progress
      await updateDoc(userRef, {
        [`goals.customGoals`]: userData.goals?.customGoals?.map(g =>
          g.id === linkedGoal.goalId ? {
            ...g,
            progress,
            status: isCompleted ? 'completed' : 'active',
            checkIns: {
              ...g.checkIns,
              [new Date().toISOString().split('T')[0]]: {
                value,
                timestamp: new Date().toISOString()
              }
            }
          } : g
        )
      });
      
      // Create completion notification if needed
      if (isCompleted) {
        const notificationRef = doc(goalNotificationsCollection);
        await setDoc(notificationRef, {
          userId,
          goalId: linkedGoal.goalId,
          type: 'completion',
          title: 'Meta Atingida!',
          message: `Parabéns! Você atingiu sua meta de ${
            metricType === 'protein' ? 'proteína' :
            metricType === 'calories' ? 'calorias' : 'refeições'
          }`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error updating goal from diet:', error);
  }
}

// Helper to record goal metric
export async function recordGoalMetric(
  goalId: string,
  metricType: string,
  value: number,
  metadata: Record<string, any> = {}
) {
  try {
    const metricRef = doc(goalMetricsCollection);
    await setDoc(metricRef, {
      goalId,
      metricType,
      value,
      metadata,
      recordedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error recording goal metric:', error);
  }
}

// Helper to get goal notifications
export async function getGoalNotifications(userId: string) {
  try {
    const q = query(
      goalNotificationsCollection,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting goal notifications:', error);
    return [];
  }
}

// Helper to mark notification as read
export async function markNotificationRead(notificationId: string) {
  try {
    const notificationRef = doc(goalNotificationsCollection, notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}