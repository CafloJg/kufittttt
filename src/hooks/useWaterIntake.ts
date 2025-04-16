import { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../context/UserContext';
import type { UserProfile } from '../types/user';

export function useWaterIntake() {
  const { user, refreshUserData } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWaterIntake = async (amount: number) => {
    if (!user || isUpdating) return;
    
    // Check if online before proceeding
    if (!navigator.onLine) {
      setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
      return null;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Get fresh user data to ensure we have the latest water intake
      let userData: UserProfile;
      
      try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error('Usuário não encontrado');
        }
        userData = userDoc.data() as UserProfile;
      } catch (fetchError) {
        // Handle Firestore errors
        if (fetchError instanceof Error && 
            (fetchError.message.includes('offline') || 
             fetchError.message.includes('client is offline'))) {
          throw new Error('Você está offline. Verifique sua conexão com a internet e tente novamente.');
        }
        throw fetchError;
      }
      
      const currentWaterIntake = userData.dailyStats?.waterIntake || 0;
      const newWaterIntake = currentWaterIntake + amount;
      
      console.log(`Updating water intake: ${currentWaterIntake} + ${amount} = ${newWaterIntake}ml`);
      
      // Update both dailyStats and currentDietPlan.dailyStats
      const updateData: any = {
        'dailyStats.waterIntake': newWaterIntake,
        'dailyStats.lastUpdated': new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // If there's a current diet plan, update its dailyStats too
      if (userData.currentDietPlan) {
        updateData['currentDietPlan.dailyStats.waterIntake'] = newWaterIntake;
        updateData['currentDietPlan.dailyStats.lastUpdated'] = new Date().toISOString();
      }
      
      await updateDoc(userRef, updateData);
      
      // Refresh user data to update UI
      await refreshUserData();
      
      return newWaterIntake;
    } catch (err) {
      console.error('Error updating water intake:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar consumo de água');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    waterIntake: user?.dailyStats?.waterIntake || 0,
    updateWaterIntake,
    isUpdating,
    error
  };
}