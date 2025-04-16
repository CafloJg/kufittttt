import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from '../types/user';

// Calculate target macros based on total calories
export function calculateTargetMacros(totalCalories: number, goalType: string = 'maintenance') {
  let proteinRatio = 0;
  let carbsRatio = 0;
  let fatRatio = 0;

  // Adjust ratios based on goal
  switch (goalType) {
    case 'loss':
      // Alto em proteína para preservar massa muscular
      proteinRatio = 0.40; // 40% proteína
      carbsRatio = 0.35;   // 35% carboidratos
      fatRatio = 0.25;     // 25% gorduras
      break;
    case 'gain':
      // Alto em carboidratos para energia e ganho
      proteinRatio = 0.30; // 30% proteína
      carbsRatio = 0.50;   // 50% carboidratos
      fatRatio = 0.20;     // 20% gorduras
      break;
    default: // Manutenção
      proteinRatio = 0.30; // 30% proteína
      carbsRatio = 0.45;   // 45% carboidratos
      fatRatio = 0.25;     // 25% gorduras
      break;
  }

  // Calculate grams using calorie ratios
  // Protein & carbs = 4 cal/g, fat = 9 cal/g
  return {
    proteinTarget: Math.round((totalCalories * proteinRatio) / 4),
    carbsTarget: Math.round((totalCalories * carbsRatio) / 4),
    fatTarget: Math.round((totalCalories * fatRatio) / 9)
  };
}

// Helper function to validate and round numeric values
function validateNumber(value: number | undefined): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round(value);
}

// Helper function to get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Update daily stats with proper validation and calculations
export async function updateDailyStats(
  userId: string,
  updates: Partial<{
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
    waterIntake: number;
    completedMeals: string[];
  }>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const today = getTodayString();

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data() as UserProfile;
    const currentStats = userData.dailyStats || {
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      waterIntake: 0,
      completedMeals: {
        [today]: []
      },
      lastUpdated: new Date().toISOString()
    };

    // Calculate target macros if not set
    if (!userData.currentDietPlan?.proteinTarget && userData.currentDietPlan?.totalCalories) {
      const targets = calculateTargetMacros(
        userData.currentDietPlan.totalCalories,
        userData.goals?.type
      );

      await updateDoc(userRef, {
        'currentDietPlan.proteinTarget': targets.proteinTarget,
        'currentDietPlan.carbsTarget': targets.carbsTarget,
        'currentDietPlan.fatTarget': targets.fatTarget
      });
    }

    // Validate and update stats
    const updatedStats = {
      ...currentStats,
      caloriesConsumed: validateNumber(updates.caloriesConsumed ?? currentStats.caloriesConsumed),
      proteinConsumed: validateNumber(updates.proteinConsumed ?? currentStats.proteinConsumed),
      carbsConsumed: validateNumber(updates.carbsConsumed ?? currentStats.carbsConsumed),
      fatConsumed: validateNumber(updates.fatConsumed ?? currentStats.fatConsumed),
      waterIntake: validateNumber(updates.waterIntake ?? currentStats.waterIntake),
      completedMeals: {
        ...currentStats.completedMeals,
        [today]: updates.completedMeals || currentStats.completedMeals[today] || []
      },
      lastUpdated: new Date().toISOString()
    };

    // Update both user document and current diet plan
    await updateDoc(userRef, {
      dailyStats: updatedStats,
      'currentDietPlan.dailyStats': updatedStats
    });
  } catch (error) {
    console.error('Error updating daily stats:', error);
    throw new Error('Erro ao atualizar estatísticas. Tente novamente.');
  }
}

export { calculateTargetMacros }