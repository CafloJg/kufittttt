import { doc, collection, query, where, getDocs, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, CustomGoal } from '../../types/user';

// Helper function to remove undefined values recursively
function removeUndefined(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}

export class GoalService {
  private static instance: GoalService;

  private constructor() {}

  static getInstance(): GoalService {
    if (!this.instance) {
      this.instance = new GoalService();
    }
    return this.instance;
  }

  async getGoalCategories() {
    return [
      { id: 'nutrition', name: 'Nutrição', description: 'Metas relacionadas à alimentação', icon: 'utensils', color: '#10B981' },
      { id: 'hydration', name: 'Hidratação', description: 'Metas de consumo de água', icon: 'droplet', color: '#3B82F6' },
      { id: 'supplement', name: 'Suplementação', description: 'Metas de suplementos e vitaminas', icon: 'pill', color: '#8B5CF6' },
      { id: 'restriction', name: 'Restrição', description: 'Metas de restrição alimentar', icon: 'x-circle', color: '#EF4444' }
    ];
  }

  async getGoalTemplates(categoryId?: string) {
    const templates = [
      {
        id: 'protein-increase',
        categoryId: 'nutrition',
        name: 'Aumentar Proteína',
        description: 'Consumir mais proteína para ganho muscular',
        targetValue: 120,
        unit: 'g',
        frequency: 'daily',
        durationDays: 30,
        difficulty: 'medium',
        tags: ['proteina', 'musculacao', 'nutricao']
      },
      {
        id: 'carbs-reduction',
        categoryId: 'nutrition',
        name: 'Reduzir Carboidratos',
        description: 'Diminuir o consumo de carboidratos',
        targetValue: 100,
        unit: 'g',
        frequency: 'daily',
        durationDays: 30,
        difficulty: 'hard',
        tags: ['lowcarb', 'emagrecimento']
      },
      {
        id: 'daily-water',
        categoryId: 'hydration',
        name: 'Água Diária',
        description: 'Beber água regularmente',
        targetValue: 2500,
        unit: 'ml',
        frequency: 'daily',
        durationDays: 30,
        difficulty: 'easy',
        tags: ['hidratacao', 'saude']
      }
      // Add more templates as needed
    ];

    return categoryId 
      ? templates.filter(t => t.categoryId === categoryId)
      : templates;
  }

  async getSuggestedGoals(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as UserProfile;

    // Get all templates
    const templates = await this.getGoalTemplates();
    
    // Get user's active goals
    const goalsRef = collection(db, 'users', userId, 'goals');
    const activeGoalsQuery = query(goalsRef, where('status', '==', 'active'));
    const activeGoalsSnap = await getDocs(activeGoalsQuery);
    const activeGoalIds = activeGoalsSnap.docs.map(doc => doc.data().templateId);

    // Filter and sort templates
    return templates
      .filter(template => !activeGoalIds.includes(template.id))
      .map(template => ({
        ...template,
        relevance: this.calculateRelevance(template, userData)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private calculateRelevance(template: any, user: UserProfile): number {
    // Calculate based on user's goals and preferences
    let relevance = 1.0;

    // Increase relevance for goals matching user's main goal
    if (user.goals?.type === 'gain' && template.tags.includes('musculacao')) {
      relevance *= 1.2;
    }
    if (user.goals?.type === 'loss' && template.tags.includes('emagrecimento')) {
      relevance *= 1.2;
    }

    // Adjust based on difficulty
    switch (template.difficulty) {
      case 'easy':
        relevance *= 1.1;
        break;
      case 'medium':
        relevance *= 1.0;
        break;
      case 'hard':
        relevance *= 0.9;
        break;
    }

    return relevance;
  }

  async createGoal(userId: string, goal: Omit<CustomGoal, 'id'>) {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const now = new Date().toISOString();

    const goalData = {
      ...goal,
      createdAt: now,
      updatedAt: now,
      progress: 0,
      status: 'active',
      checkIns: {}
    };

    // Clean the object before sending to Firestore
    const cleanedGoalData = removeUndefined(goalData);

    const docRef = await addDoc(goalsRef, cleanedGoalData);
    // Return the cleaned data along with the new ID
    return { id: docRef.id, ...cleanedGoalData }; 
  }

  async updateGoalProgress(
    userId: string,
    goalId: string,
    value: number,
    notes?: string,
    mood?: 'great' | 'good' | 'okay' | 'bad'
  ) {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalDoc = await getDoc(goalRef);
    
    if (!goalDoc.exists()) {
      throw new Error('Goal not found');
    }

    const goal = goalDoc.data() as CustomGoal;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Calculate new progress
    const newProgress = this.calculateProgress(goal, value);

    // Prepare update data, ensuring checkIn details are not undefined
    const updateData: Record<string, any> = {
      progress: newProgress,
      [`checkIns.${today}`]: {
        value,
        // Only include notes and mood if they are provided
        ...(notes && { notes }), 
        ...(mood && { mood }), 
        timestamp: now
      },
      updatedAt: now,
      status: newProgress >= 100 ? 'completed' : 'active'
    };

    // Clean the update data as well (belt and suspenders)
    const cleanedUpdateData = removeUndefined(updateData);

    await updateDoc(goalRef, cleanedUpdateData);

    // Return the updated check-in details
    return {
      goalId,
      progress: newProgress,
      checkIn: cleanedUpdateData[`checkIns.${today}`] // Return the cleaned check-in
    };
  }

  private calculateProgress(goal: CustomGoal, newValue: number): number {
    const today = new Date().toISOString().split('T')[0];
    const checkIns = Object.values(goal.checkIns || {});
    const totalValue = checkIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
    
    switch (goal.frequency) {
      case 'daily':
        return Math.min((newValue / goal.target) * 100, 100);
      
      case 'weekly': {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekCheckIns = checkIns.filter(checkIn => 
          new Date(checkIn.timestamp) >= weekStart
        );
        const weekTotal = weekCheckIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
        return Math.min((weekTotal / goal.target) * 100, 100);
      }
      
      case 'monthly': {
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthCheckIns = checkIns.filter(checkIn =>
          new Date(checkIn.timestamp) >= monthStart
        );
        const monthTotal = monthCheckIns.reduce((sum, checkIn) => sum + checkIn.value, 0) + newValue;
        return Math.min((monthTotal / goal.target) * 100, 100);
      }
      
      default:
        return Math.min((totalValue / goal.target) * 100, 100);
    }
  }

  async getUserGoals(userId: string) {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const goalsSnap = await getDocs(goalsRef);
    
    return goalsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomGoal[];
  }
}

export const goalService = GoalService.getInstance();