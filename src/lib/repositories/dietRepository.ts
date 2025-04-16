import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { NetworkStatus } from '../../utils/network';
import { DietPlan } from '../../types/user';
import { z } from 'zod';

// Define a more flexible food schema that allows missing ID field
const foodSchema = z.object({ 
  id: z.string().optional().default(() => `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  name: z.string(),
  portion: z.string(),
  calories: z.number(),
  protein: z.number().optional().default(0),
  carbs: z.number().optional().default(0),
  fat: z.number().optional().default(0),
  imageUrl: z.string().optional(),
  thumbnailUrl: z.string().optional()
});

const mealSchema = z.object({
  id: z.string(),
  name: z.string(),
  time: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  foods: z.array(foodSchema),
  imageUrl: z.string().optional(),
  thumbnailUrl: z.string().optional()
});

const dailyStatsSchema = z.object({
  caloriesConsumed: z.number().default(0),
  proteinConsumed: z.number().default(0),
  carbsConsumed: z.number().default(0),
  fatConsumed: z.number().default(0),
  waterIntake: z.number().default(0),
  completedMeals: z.record(z.array(z.string())).optional().default({}),
  lastUpdated: z.string().optional()
});

const dietPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string().optional(),
  totalCalories: z.number(),
  proteinTarget: z.number(),
  carbsTarget: z.number(),
  fatTarget: z.number(),
  meals: z.array(mealSchema),
  dailyStats: dailyStatsSchema.optional()
});

export class DietRepository {
  private static instance: DietRepository;

  private constructor() {}

  static getInstance(): DietRepository {
    if (!this.instance) {
      this.instance = new DietRepository();
    }
    return this.instance;
  }

  async getCurrentPlan(userId: string): Promise<DietPlan | null> {
    try {
      console.log(`Fetching current plan for user: ${userId}`);
      
      // Check if we're online before trying to fetch
      const networkStatus = NetworkStatus.getInstance();
      if (!networkStatus.isOnline()) {
        console.warn('Cannot fetch diet plan while offline');
        return null;
      }
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      if (!userData.currentDietPlan) {
        // console.log('No current diet plan found');
        return null;
      }

      // Ensure the plan has a valid dailyStats structure
      if (!userData.currentDietPlan.dailyStats) {
        userData.currentDietPlan.dailyStats = {
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          waterIntake: 0,
          completedMeals: {},
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Ensure completedMeals exists
      if (!userData.currentDietPlan.dailyStats.completedMeals) {
        userData.currentDietPlan.dailyStats.completedMeals = {};
      }
      
      // Ensure today's entry exists
      const today = new Date().toISOString().split('T')[0];
      if (!userData.currentDietPlan.dailyStats.completedMeals[today]) {
        // Create a new array to avoid reference issues
        userData.currentDietPlan.dailyStats.completedMeals = {
          ...userData.currentDietPlan.dailyStats.completedMeals,
          [today]: []
        };
      }
      try {
        const validatedPlan = dietPlanSchema.parse(userData.currentDietPlan);
        // console.log(`Current plan fetched successfully: ${validatedPlan.id}`);
        return validatedPlan as DietPlan;
      } catch (validationError) {
        console.warn('Diet plan validation warning (returning plan anyway):', validationError);
        // Return the plan anyway even if validation fails
        if (!userData.currentDietPlan.createdAt) {
          userData.currentDietPlan.createdAt = new Date().toISOString();
        }
        return userData.currentDietPlan as DietPlan;
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
      throw error;
    }
  }

  async getDietHistory(userId: string): Promise<DietPlan[]> {
    try {
      // Check if we're online before trying to fetch
      if (!navigator.onLine) {
        console.warn('Cannot fetch diet history while offline');
        return [];
      }
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [];

      const userData = userDoc.data();
      if (!userData.dietHistory?.plans) return [];

      try {
        // Process plans with default values
        const processedPlans = userData.dietHistory.plans.map((plan: any, planIndex: number) => {
          return {
            ...plan,
            id: plan.id || `plan_${planIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            createdAt: plan.createdAt || new Date().toISOString(),
            totalCalories: plan.totalCalories || 0,
            proteinTarget: plan.proteinTarget || 0,
            carbsTarget: plan.carbsTarget || 0,
            fatTarget: plan.fatTarget || 0,
            meals: Array.isArray(plan.meals) 
              ? plan.meals.map((meal: any, mealIndex: number) => ({
                  ...meal,
                  id: meal.id || `meal_${planIndex}_${mealIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: meal.name || 'Refeição',
                  time: meal.time || '12:00',
                  calories: meal.calories || 0,
                  protein: meal.protein || 0,
                  carbs: meal.carbs || 0,
                  fat: meal.fat || 0,
                  foods: Array.isArray(meal.foods) 
                    ? meal.foods.map((food: any, foodIndex: number) => ({
                        ...food,
                        id: food.id || `food_${planIndex}_${mealIndex}_${foodIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: food.name || 'Alimento',
                        portion: food.portion || 'porção',
                        calories: food.calories || 0,
                        protein: food.protein || 0,
                        carbs: food.carbs || 0,
                        fat: food.fat || 0
                      }))
                    : []
                }))
              : []
          };
        });
        
        // Validate plans with Zod
        const validatedPlans = z.array(dietPlanSchema).parse(processedPlans);
        return validatedPlans as DietPlan[];
      } catch (error) {
        console.error('Error validating diet history plans:', error);
        // Return empty array on validation error to prevent app crash
        return [];
      }
    } catch (error) {
      console.error('Error fetching diet history:', error);
      throw error;
    }
  }

  async updateCurrentPlan(userId: string, plan: DietPlan): Promise<void> {
    try {
      // console.log(`Updating current plan for user: ${userId}, plan ID: ${plan.id}`);

      // Check if we're online before trying to update
      const networkStatus = NetworkStatus.getInstance();
      if (!networkStatus.isOnline()) {
        console.warn('Cannot update diet plan while offline');
        throw new Error('Você está offline. Não é possível atualizar o plano alimentar.');
      }
      
      console.log('Plan dailyStats to save:', JSON.stringify(plan.dailyStats));
      
      // Ensure createdAt is set
      if (!plan.createdAt) {
        plan.createdAt = new Date().toISOString();
      }
      
      // Ensure dailyStats is properly structured
      if (!plan.dailyStats) {
        plan.dailyStats = {
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          waterIntake: 0,
          completedMeals: { [new Date().toISOString().split('T')[0]]: [] },
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Ensure completedMeals exists with a safe structure
      const today = new Date().toISOString().split('T')[0];
      
      // Ensure completedMeals exists
      if (!plan.dailyStats.completedMeals) {
        plan.dailyStats.completedMeals = {};
      }
      
      // Ensure today's entry exists
      if (!plan.dailyStats.completedMeals[today]) {
        plan.dailyStats.completedMeals[today] = [];
      }
      
      // Try to validate, but proceed even if validation fails
      let validatedPlan;
      try {
        validatedPlan = dietPlanSchema.parse(plan);
      } catch (validationError) {
        console.warn('Diet plan validation warning:', validationError);
        validatedPlan = plan; // Use original plan if validation fails
      }
      
      // Update the plan in Firestore
      const userRef = doc(db, 'users', userId);
      try {
        // Add retry logic for network errors
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000;
        
        while (retryCount <= maxRetries) {
          try {
            // console.log('Updating user document with plan ID:', plan.id);
            // console.log('Final dailyStats to save:', JSON.stringify(plan.dailyStats));
            
            // Ensure completedMeals is correctly structured
            const today = new Date().toISOString().split('T')[0];
            
            // Create a deep copy of the plan to avoid reference issues
            const planToSave = JSON.parse(JSON.stringify(plan));
            
            // Ensure dailyStats exists
            if (!planToSave.dailyStats) {
              planToSave.dailyStats = {
                caloriesConsumed: 0,
                proteinConsumed: 0,
                carbsConsumed: 0,
                fatConsumed: 0,
                waterIntake: 0,
                completedMeals: {},
                lastUpdated: new Date().toISOString()
              };
            }
            
            // Ensure completedMeals exists
            if (!planToSave.dailyStats.completedMeals) {
              planToSave.dailyStats.completedMeals = {};
            }
            
            // Criar uma cópia profunda para evitar problemas de referência
            const completedMeals = planToSave.dailyStats.completedMeals;
            
            // Ensure today's entry exists
            if (!completedMeals[today]) {
              completedMeals[today] = [];
            }
            
            // Atualizar tanto o plano quanto as estatísticas diárias do usuário
            const updates = {
              currentDietPlan: planToSave,
              dailyStats: {
                completedMeals: completedMeals,
                caloriesConsumed: planToSave.dailyStats.caloriesConsumed || 0,
                proteinConsumed: planToSave.dailyStats.proteinConsumed || 0,
                carbsConsumed: planToSave.dailyStats.carbsConsumed || 0,
                fatConsumed: planToSave.dailyStats.fatConsumed || 0,
                waterIntake: planToSave.dailyStats.waterIntake || 0,
                lastUpdated: new Date().toISOString()
              },
              updatedAt: new Date().toISOString()
            };
            
            // Use a transaction to ensure atomic updates
            await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) {
                throw new Error('User document not found');
              }
              
              // Get the latest user data to ensure we have the most up-to-date values
              const userData = userDoc.data();
              
              // Get existing data to merge with
              const existingDailyStats = userData.dailyStats || {};
              const existingCompletedMeals = existingDailyStats.completedMeals || {};
              
              // Get today's completed meals, ensuring it's an array
              let existingTodayMeals = [];
              if (existingCompletedMeals[today]) {
                existingTodayMeals = Array.isArray(existingCompletedMeals[today]) 
                  ? [...existingCompletedMeals[today]] 
                  : [];
                
                if (!Array.isArray(existingCompletedMeals[today]))
                  console.warn('existingCompletedMeals[today] is not an array, creating empty array');
              }
              
              // Get the plan's completed meals for today
              let planTodayMeals = [];
              if (planToSave.dailyStats?.completedMeals?.[today]) {
                planTodayMeals = Array.isArray(planToSave.dailyStats.completedMeals[today])
                  ? [...planToSave.dailyStats.completedMeals[today]]
                  : [];
                
                if (!Array.isArray(planToSave.dailyStats.completedMeals[today]))
                  console.warn('planToSave.dailyStats.completedMeals[today] is not an array, creating empty array');
              }
              
              const existingWaterIntake = existingDailyStats.waterIntake || 0;
              
              // Combine all meal IDs without duplicates
              const updatedTodayMeals = [...new Set([...existingTodayMeals, ...planTodayMeals])];
              
              console.log('Existing today meals:', existingTodayMeals);
              console.log('Plan today meals:', planTodayMeals);
              console.log('Combined today meals:', updatedTodayMeals);
              
              // Calculate the correct calorie and macro values
              // If the plan has higher values, use those (they include the newly completed meal)
              // Otherwise, use the existing values
              const finalCalories = Math.max(
                planToSave.dailyStats.caloriesConsumed || 0,
                existingDailyStats.caloriesConsumed || 0
              );
              
              const finalProtein = Math.max(
                planToSave.dailyStats.proteinConsumed || 0,
                existingDailyStats.proteinConsumed || 0
              );
              
              const finalCarbs = Math.max(
                planToSave.dailyStats.carbsConsumed || 0,
                existingDailyStats.carbsConsumed || 0
              );
              
              const finalFat = Math.max(
                planToSave.dailyStats.fatConsumed || 0,
                existingDailyStats.fatConsumed || 0
              );
              
              // Update the final updates object
              updates.dailyStats = {
                ...existingDailyStats,
                completedMeals: {
                  ...existingCompletedMeals,
                  [today]: updatedTodayMeals
                },
                caloriesConsumed: finalCalories,
                proteinConsumed: finalProtein,
                carbsConsumed: finalCarbs,
                fatConsumed: finalFat,
                waterIntake: existingWaterIntake,
                lastUpdated: new Date().toISOString()
              };
              
              // Also update the plan's dailyStats to match
              planToSave.dailyStats = {
                ...planToSave.dailyStats,
                completedMeals: (() => {
                  // Create a safe copy of the existing completedMeals
                  const safeCompletedMeals = { ...planToSave.dailyStats.completedMeals };
                  
                  // Ensure today's entry is an array
                  safeCompletedMeals[today] = updatedTodayMeals;
                  
                  return safeCompletedMeals;
                })(),
                caloriesConsumed: finalCalories,
                proteinConsumed: finalProtein,
                carbsConsumed: finalCarbs,
                fatConsumed: finalFat,
                waterIntake: existingWaterIntake,
                lastUpdated: new Date().toISOString()
              };
              
              updates.currentDietPlan = planToSave;
              
              transaction.update(userRef, updates);
            });

            // If we get here, the update was successful
            break;
          } catch (error) {
            retryCount++;
            
            // Check if it's a network error
            const isNetworkError = error instanceof Error && 
              (error.message.includes('network') || 
               error.message.includes('fetch') ||
               error.message.includes('offline'));
            
            // If it's the last retry or not a network error, rethrow
            if (retryCount > maxRetries || !isNetworkError) {
              throw error;
            }
            
            // Wait before retrying
            console.log(`Network error, retrying (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
          }
        }
        
        // console.log(`Diet plan updated successfully: ${plan.id}`);
        // console.log('Completed meals after update:', JSON.stringify(completedMeals));
      } catch (updateError) {
        console.error('Error updating diet plan in Firestore:', {
          error: updateError,
          userId,
          planId: plan.id
        });
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating current plan:', error);
      throw error;
    }
  }
  
  // New method to update both the plan and user stats atomically
  async updateCurrentPlanAndUserStats(userId: string, plan: DietPlan): Promise<void> {
    try {
      // Check if we're online before trying to update
      const networkStatus = NetworkStatus.getInstance();
      if (!networkStatus.isOnline()) {
        console.warn('Cannot update diet plan while offline');
        throw new Error('Você está offline. Não é possível atualizar o plano alimentar.');
      }
      
      // Ensure createdAt is set
      if (!plan.createdAt) {
        plan.createdAt = new Date().toISOString();
      }
      
      // Ensure dailyStats is properly structured
      if (!plan.dailyStats) {
        plan.dailyStats = {
          caloriesConsumed: 0,
          proteinConsumed: 0,
          carbsConsumed: 0,
          fatConsumed: 0,
          waterIntake: 0,
          completedMeals: { [new Date().toISOString().split('T')[0]]: [] },
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Ensure completedMeals exists with a safe structure
      const today = new Date().toISOString().split('T')[0];
      
      // Ensure completedMeals exists
      if (!plan.dailyStats.completedMeals) {
        plan.dailyStats.completedMeals = {};
      }
      
      // Ensure today's entry exists
      if (!plan.dailyStats.completedMeals[today]) {
        plan.dailyStats.completedMeals[today] = [];
      }
      
      // Try to validate, but proceed even if validation fails
      let validatedPlan;
      try {
        validatedPlan = dietPlanSchema.parse(plan);
      } catch (validationError) {
        console.warn('Diet plan validation warning:', validationError);
        validatedPlan = plan; // Use original plan if validation fails
      }
      
      // Update both the plan and user stats in a single transaction
      const userRef = doc(db, 'users', userId);
      
      try {
        // Add retry logic for network errors
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000;
        
        while (retryCount <= maxRetries) {
          try {
            // Create a deep copy of the plan to avoid reference issues
            const planToSave = JSON.parse(JSON.stringify(plan));
            
            // Use a transaction to ensure atomic updates
            await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) {
                throw new Error('User document not found');
              }
              
              // Get the latest user data
              const userData = userDoc.data();
              
              // Get existing data to merge with
              const existingDailyStats = userData.dailyStats || {};
              const existingCompletedMeals = existingDailyStats.completedMeals || {};
              
              // Get today's completed meals, ensuring it's an array
              let existingTodayMeals = [];
              if (existingCompletedMeals[today]) {
                existingTodayMeals = Array.isArray(existingCompletedMeals[today]) 
                  ? [...existingCompletedMeals[today]] 
                  : [];
              }
              
              // Get the plan's completed meals for today
              let planTodayMeals = [];
              if (planToSave.dailyStats?.completedMeals?.[today]) {
                planTodayMeals = Array.isArray(planToSave.dailyStats.completedMeals[today])
                  ? [...planToSave.dailyStats.completedMeals[today]]
                  : [];
              }
              
              const existingWaterIntake = existingDailyStats.waterIntake || 0;
              
              // Combine all meal IDs without duplicates
              const updatedTodayMeals = [...new Set([...existingTodayMeals, ...planTodayMeals])];
              
              // Calculate the correct calorie and macro values
              // Use the values from the plan as they contain the updated values
              // Find the newly completed meal to add its values
              const currentPlan = userData.currentDietPlan || {};
              const currentMeals = currentPlan.meals || [];
              
              // Get the meal that was just completed (the one in planTodayMeals but not in existingTodayMeals)
              const newlyCompletedMealIds = planTodayMeals.filter(id => !existingTodayMeals.includes(id));
              
              // Calculate the values to add from newly completed meals
              let addedCalories = 0;
              let addedProtein = 0;
              let addedCarbs = 0;
              let addedFat = 0;
              
              // Add values from newly completed meals
              for (const mealId of newlyCompletedMealIds) {
                const meal = currentMeals.find(m => m.id === mealId);
                if (meal) {
                  addedCalories += meal.calories || 0;
                  addedProtein += meal.protein || 0;
                  addedCarbs += meal.carbs || 0;
                  addedFat += meal.fat || 0;
                  console.log(`Adding values from meal ${mealId}:`, {
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fat: meal.fat
                  });
                }
              }
              
              // Add the new values to the existing ones
              const finalCalories = (existingDailyStats.caloriesConsumed || 0) + addedCalories;
              const finalProtein = (existingDailyStats.proteinConsumed || 0) + addedProtein;
              const finalCarbs = (existingDailyStats.carbsConsumed || 0) + addedCarbs;
              const finalFat = (existingDailyStats.fatConsumed || 0) + addedFat;
              
              console.log('Final nutrition values:', {
                calories: finalCalories,
                protein: finalProtein,
                carbs: finalCarbs,
                fat: finalFat,
                added: {
                  calories: addedCalories,
                  protein: addedProtein,
                  carbs: addedCarbs,
                  fat: addedFat
                }
              });
              
              // Update user's dailyStats
              const updatedDailyStats = {
                ...existingDailyStats,
                completedMeals: {
                  ...existingCompletedMeals,
                  [today]: updatedTodayMeals
                },
                caloriesConsumed: finalCalories,
                proteinConsumed: finalProtein,
                carbsConsumed: finalCarbs,
                fatConsumed: finalFat,
                waterIntake: existingWaterIntake,
                lastUpdated: new Date().toISOString()
              };
              
              // Update plan's dailyStats
              planToSave.dailyStats = {
                ...planToSave.dailyStats,
                completedMeals: {
                  ...planToSave.dailyStats.completedMeals,
                  [today]: updatedTodayMeals
                },
                caloriesConsumed: finalCalories,
                proteinConsumed: finalProtein,
                carbsConsumed: finalCarbs,
                fatConsumed: finalFat,
                waterIntake: existingWaterIntake,
                lastUpdated: new Date().toISOString()
              };
              
              // Update both in a single transaction
              transaction.update(userRef, {
                currentDietPlan: planToSave,
                dailyStats: updatedDailyStats,
                updatedAt: new Date().toISOString()
              });
            });
            
            // If we get here, the update was successful
            break;
          } catch (error) {
            retryCount++;
            
            // Check if it's a network error
            const isNetworkError = error instanceof Error && 
              (error.message.includes('network') || 
               error.message.includes('fetch') ||
               error.message.includes('offline'));
            
            // If it's the last retry or not a network error, rethrow
            if (retryCount > maxRetries || !isNetworkError) {
              throw error;
            }
            
            // Wait before retrying
            console.log(`Network error, retrying (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
          }
        }
      } catch (updateError) {
        console.error('Error updating diet plan and user stats in Firestore:', {
          error: updateError,
          userId,
          planId: plan.id
        });
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating current plan and user stats:', error);
      throw error;
    }
  }
}