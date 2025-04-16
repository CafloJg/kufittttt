export type FoodCategory = 
  | 'meat'
  | 'fish'
  | 'eggs'
  | 'dairy'
  | 'plant_protein'
  | 'legumes'
  | 'grain'
  | 'tuber'
  | 'cereal'
  | 'vegetable'
  | 'fruit'
  | 'oil'
  | 'nut'
  | 'seed'
  | 'supplement';

export interface Food {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: FoodCategory;
  preparation: string[];
  tags: string[];
  nutritionalInfo?: {
    vitamins?: {
      name: string;
      amount: number;
      unit: string;
      percentDV: number;
    }[];
    minerals?: {
      name: string;
      amount: number;
      unit: string;
      percentDV: number;
    }[];
    glycemicIndex?: number;
    glycemicLoad?: number;
    antinutrients?: string[];
    allergens?: string[];
    bioactiveCompounds?: string[];
  };
  seasonality?: {
    peak: string[];
    available: string[];
  };
  sustainability?: {
    carbonFootprint: number;
    waterUsage: number;
    locallySourced: boolean;
  };
  alternatives?: {
    vegan?: string[];
    glutenFree?: string[];
    lowCarb?: string[];
  };
  dietTypes: string[]; // Tipos de dieta compatíveis
  createdAt?: Date;
}

// Interface for food analysis results
export interface FoodAnalysis {
  ingredients: string[];
  timestamp: string;
  imageUrl: string;
  confidence: number;
  preparation: string[];
}

// Interface para receitas
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: {
    foodId: string;
    amount: number;
    unit: string;
  }[];
  instructions: string[];
  prepTime: number; // em minutos
  cookTime: number; // em minutos
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  tags: string[];
  dietTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
}