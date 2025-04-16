import { collections, db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { z } from 'zod';
import type { CustomGoal } from '../../types/user';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class GoalRepository {
  private static instance: GoalRepository;
  private constructor() {}

  static getInstance(): GoalRepository {
    if (GoalRepository.instance) {
      return GoalRepository.instance;
    }
    
    GoalRepository.instance = new GoalRepository();
    return GoalRepository.instance;
  }

  async getUserGoals(userId: string): Promise<CustomGoal[]> {
    try {
      let retries = 0;
      let lastError: Error | null = null;

      while (retries < MAX_RETRIES) {
        try {
          const cols = await collections;
          
          // If collections failed to initialize, use temporary collection
          const goalsCollection = cols?.goalsCollection || collection(db, 'goals');
          
          const snapshot = await getDocs(
            query(goalsCollection, where('userId', '==', userId))
          );
          
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as CustomGoal[];

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.warn(`Attempt ${retries + 1} failed:`, error);
          
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries - 1)));
            continue;
          }
        }
      }
      
      throw lastError || new Error('Failed to fetch goals after retries');

    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }
}