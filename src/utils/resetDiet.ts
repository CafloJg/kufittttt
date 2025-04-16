import { doc, getDoc, updateDoc, query, collection, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function resetUserDiet(email: string): Promise<void> {
  try {
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Usuário não encontrado');
    }

    const userDoc = querySnapshot.docs[0];
    const today = new Date().toISOString().split('T')[0];

    // Reset all diet-related data
    await updateDoc(doc(db, 'users', userDoc.id), {
      currentDietPlan: null,
      lastPlanGenerated: null,
      dailyStats: {
        waterIntake: 0,
        caloriesConsumed: 0,
        proteinConsumed: 0,
        carbsConsumed: 0,
        fatConsumed: 0,
        stepsCount: 0,
        workoutMinutes: 0,
        completedMeals: {
          [today]: []
        },
        lastUpdated: new Date().toISOString()
      },
      foodAnalysis: null,
      lastDietReset: new Date().toISOString()
    });

    console.log('Diet data reset successfully for user:', email);
  } catch (error) {
    console.error('Error resetting diet data:', error);
    throw new Error('Failed to reset diet data. Please try again.');
  }
}