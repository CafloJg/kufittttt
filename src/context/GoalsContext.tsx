import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useUser } from './UserContext';
import type { CustomGoal } from '../types/user';

interface GoalsContextType {
  goals: CustomGoal[];
  isLoading: boolean;
  error: string | null;
  createGoal: (goal: Partial<CustomGoal>) => Promise<void>;
  updateGoalProgress: (goalId: string, value: number) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [goals, setGoals] = useState<CustomGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load goals when user changes
  useEffect(() => {
    if (!user) {
      setGoals([]);
      setIsLoading(false);
      return;
    }
    
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get goals from user profile
        const userGoals = user.goals?.customGoals || [];
        setGoals(userGoals);
      } catch (err) {
        console.error('Error loading goals:', err);
        setError('Erro ao carregar metas');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGoals();
  }, [user]);

  const refreshGoals = async () => {
    if (!user || !auth.currentUser) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userGoals = userData.goals?.customGoals || [];
        setGoals(userGoals);
      }
    } catch (err) {
      console.error('Error refreshing goals:', err);
      setError('Erro ao atualizar metas');
    } finally {
      setIsLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<CustomGoal>) => {
    if (!user || !auth.currentUser) {
      setError('Usuário não autenticado');
      return; 
    }
    
    try {
      setError(null);
      
      // Validate required fields
      if (!goalData.type || !goalData.name || goalData.target === undefined || !goalData.unit) {
        throw new Error('Todos os campos obrigatórios devem ser preenchidos');
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const currentData = userDoc.data();
      const currentGoals = currentData.goals?.customGoals || [];
      
      // Check if similar goal already exists
      const hasSimilarGoal = currentGoals.some((goal: any) => 
        goal.type === goalData.type && 
        goal.status === 'active' &&
        goal.name?.toLowerCase() === goalData.name?.toLowerCase()
      );

      if (hasSimilarGoal) {
        throw new Error(`Você já tem uma meta ativa chamada "${goalData.name}"`);
      }

      // Special handling for weight goals
      if (goalData.type === 'weight') {
        // Ensure metadata exists
        const metadata = goalData.metadata || {};
        
        // Set start value to current weight if not provided
        if (metadata.startValue === undefined) {
          metadata.startValue = user.weight || 0;
        }
        
        // Set target value to goal target if not provided
        if (metadata.targetValue === undefined) {
          metadata.targetValue = goalData.target || 0;
        }
        
        // Update metadata with safe values
        goalData.metadata = metadata;
        
        // Calculate initial progress
        if (metadata.startValue !== undefined && metadata.targetValue !== undefined) {
          const startWeight = metadata.startValue;
          const targetWeight = metadata.targetValue;
          const currentWeight = user.weight || startWeight;
          
          // Calculate progress based on direction (loss or gain)
          const isWeightLoss = targetWeight < startWeight;
          const totalChange = Math.abs(targetWeight - startWeight);
          const currentChange = isWeightLoss 
            ? Math.max(0, startWeight - currentWeight)  // For weight loss
            : Math.max(0, currentWeight - startWeight); // For weight gain
          
          // Calculate progress percentage (0-100)
          if (totalChange > 0) {
            goalData.progress = Math.min((currentChange / totalChange) * 100, 100);
          }
        }
      }

      const newGoal = {
        // Ensure all required fields are present with defaults if needed
        type: goalData.type,
        name: goalData.name,
        description: goalData.description || '',
        target: goalData.target,
        unit: goalData.unit,
        frequency: goalData.frequency || 'daily',
        duration: goalData.duration || 30,
        status: 'active',
        progress: 0,
        checkIns: goalData.checkIns || {},
        metadata: goalData.metadata || {},
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update user document with new goal
      await updateDoc(userRef, {
        [`goals.customGoals`]: [...currentGoals, newGoal],
        'goals.updatedAt': new Date().toISOString()
      });

      // Update local state
      setGoals(prev => [...prev, newGoal as CustomGoal]);
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar meta');
      throw err;
    }
  };

  const updateGoalProgress = async (goalId: string, value: number) => {
    if (!user || !auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }
    
    try {
      setError(null);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;

      const today = new Date().toISOString().split('T')[0];
      const currentData = userDoc.data();
      const currentGoals = currentData.goals?.customGoals || [];
      const goal = currentGoals.find((g: any) => g.id === goalId);
      
      if (!goal) return;

      // Calculate new progress
      let progress = 0;
      
      if (goal.type === 'water' || goal.type === 'protein' || goal.type === 'nutrition') {
        progress = Math.min((value / (goal.target || 1)) * 100, 100);
      } else if (goal.type === 'weight') {
        const startWeight = goal.metadata?.startValue || user.weight || 0;
        const targetWeight = goal.metadata?.targetValue || goal.target;
        const totalChange = Math.abs(targetWeight - startWeight);
        const currentChange = Math.abs(value - startWeight);
        progress = totalChange > 0 ? Math.min((currentChange / totalChange) * 100, 100) : 0;
      }

      // Update goals structure with new progress
      const updatedGoals = currentGoals.map((g: any) => 
        g.id === goalId ? {
          ...g,
          progress,
          checkIns: {
            ...g.checkIns,
            [today]: {
              value,
              timestamp: new Date().toISOString()
            }
          },
          status: progress >= 100 ? 'completed' : 'active',
          updatedAt: new Date().toISOString()
        } : g
      );

      await updateDoc(userRef, {
        'goals.customGoals': updatedGoals,
        'goals.updatedAt': new Date().toISOString()
      });

      // Update local state
      setGoals(updatedGoals);
    } catch (err) {
      console.error('Error updating goal progress:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar progresso');
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user || !auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }
    
    try {
      setError(null);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;

      const currentData = userDoc.data();
      const updatedGoals = currentData.goals?.customGoals?.filter((g: any) => g.id !== goalId) || [];

      await updateDoc(userRef, {
        'goals.customGoals': updatedGoals,
        'goals.updatedAt': new Date().toISOString()
      });

      // Update local state
      setGoals(updatedGoals);
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir meta');
    }
  };

  return (
    <GoalsContext.Provider value={{
      goals,
      isLoading,
      error,
      createGoal,
      updateGoalProgress,
      deleteGoal,
      refreshGoals
    }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}