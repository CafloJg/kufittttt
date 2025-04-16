export interface WeightProgress {
  weight: number;
  date: string; // Store as ISO string
  difference: number;
}

export interface DietHistory {
  plans: DietPlan[];
  lastUpdated: string;
  stats: {
    [date: string]: {
      caloriesConsumed: number;
      proteinConsumed: number;
      carbsConsumed: number;
      fatConsumed: number;
      completedMeals: string[];
      waterIntake: number;
    };
  };
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  checked: boolean;
  mealIds: string[];
  addedAt: string;
  notes?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'onboarding' | 'streak' | 'nutrition' | 'macros' | 'special';
  icon: string;
  reward_kiicoins: number;
  progress: number;
  completed: boolean;
  completedAt?: string;
  requirements: {
    type: string;
    target: number;
    current: number;
  };
  metadata?: {
    streakDays?: number;
    uniqueFoods?: string[];
    balancedDays?: number;
    lastUpdate?: string;
  };
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  totalCheckIns: number;
}

export interface DietGoal {
  linkToDiet: boolean;
  planId: string;
  metricType: 'protein' | 'calories' | 'meals';
  autoUpdate: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
  subscriptionTier?: 'basic' | 'premium' | 'premium-plus';
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled';
  createdAt: Date;
  completedOnboarding: boolean;
  showTutorial?: boolean;
  autoCheckIn?: boolean;
  refreshUserData?: () => Promise<UserProfile | null>;
  dietGoals?: Record<string, DietGoal>;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
  dietType?: DietType;
  lifeContext?: LifeContext;
  budgetPreference?: BudgetPreference;
  allergies?: string[];
  favoriteMeals?: Record<string, {
    id?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foods: Array<{
      name: string;
      portion: string;
    }>;
    savedAt: string;
  }>;
  dailyStats?: {
    mood?: 'great' | 'good' | 'okay' | 'bad';
    lastMoodCheck?: string;
    macroDistribution?: {
      protein: number;
      carbs: number;
      fat: number;
    };
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
    waterIntake: number;
    completedMeals?: {
      [date: string]: string[];
    };
  };
  goals?: {
    type: GoalType;
    targetWeight?: number;
    activityLevel?: ActivityLevel;
    calorieTarget?: number;
    customGoals?: CustomGoal[];
    weeklyProgress?: {
      [weekId: string]: {
        completedGoals: number;
        totalGoals: number;
        caloriesConsumed: number;
        caloriesTarget: number;
        waterConsumed: number;
        waterTarget: number;
        macrosBalance: number;
        updatedAt: string;
      };
    };
  };
  achievements?: Record<string, Achievement>;
  dailyStreak?: DailyStreak;
  kiiCoins?: {
    balance: number;
    transactions: {
      id: string;
      amount: number;
      type: 'earned' | 'spent';
      source: 'achievement' | 'streak' | 'check-in' | 'purchase';
      description: string;
      timestamp: string;
    }[];
    lastUpdated: string;
  };
  level?: number;
  experience?: number;
}

export interface DailyStats {
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterIntake: number;
  completedMeals: {
    [date: string]: string[];
  };
  lastUpdated: string;
}

export interface DietPlan {
  id: string;
  userId: string;
  nextPlans?: {
    [date: string]: {
      meals: Meal[];
      totalCalories: number;
      proteinTarget: number;
      carbsTarget: number; 
      fatTarget: number;
    }
  };
  createdAt: string;
  lastActive: string;
  completedOnboarding: boolean;
  dailyStats?: DailyStats;
  foodPreferences?: {
    [foodId: string]: {
      name: string;
      type: 'like' | 'dislike';
      score: number; // 1 to 5 for likes, -5 to -1 for dislikes
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      portion: string;
      updatedAt: string;
    };
  };
  goals?: {
    type: GoalType;
    targetWeight?: number;
  };
  date?: string;
  name?: string;
  description?: string;
  rating?: number;
  totalCalories: number;
  proteinTarget: number;
  carbsTarget: number; 
  fatTarget: number;
  meals: Meal[];
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    thumbnailUrl?: string;
    imageUrl?: string;
    alternatives?: Array<{
      name: string;
      portion: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      thumbnailUrl?: string;
      imageUrl?: string;
    }>;
  }[];
}

export interface CustomGoal {
  id: string;
  userId: string;
  type: 'nutrition' | 'hydration' | 'supplement' | 'restriction';
  name: string;
  description?: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
  progress: number;
  status: 'active' | 'completed' | 'failed';
  checkIns: {
    [date: string]: {
      value: number;
      notes?: string;
      mood?: 'great' | 'good' | 'okay' | 'bad';
      timestamp: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export type GoalType = 'loss' | 'gain' | 'maintenance';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type BudgetPreference = 'low' | 'medium' | 'high';
export type LifeContext = 'none' | 'maternity' | 'home';
export type Gender = 'masculino' | 'feminino' | 'nao-binario';
export type DietType = 'omnivoro' | 'vegetariano' | 'vegano' | 'low-carb' | 'cetogenica' | 'mediterranea';