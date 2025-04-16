import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { Food } from '../../types/food';
import type { UserProfile } from '../../types/user';

// Validation schemas
const nutritionAnalysisSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  vitamins: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    unit: z.string()
  })),
  minerals: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    unit: z.string()
  }))
});

const mealRecommendationSchema = z.object({
  name: z.string(),
  foods: z.array(z.object({
    name: z.string(),
    portion: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  })),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
  preparationTime: z.number(),
  cookingInstructions: z.array(z.string())
});

export class NutritionService {
  private static instance: NutritionService;
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  private constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  static getInstance(): NutritionService {
    if (!this.instance) {
      this.instance = new NutritionService();
    }
    return this.instance;
  }

  async analyzeNutrition(foods: Food[]): Promise<z.infer<typeof nutritionAnalysisSchema>> {
    try {
      const prompt = `
        Analyze the nutritional content of these foods:
        ${foods.map(f => `${f.name} (${f.portion})`).join('\n')}

        Return a JSON object with:
        1. Total calories, protein, carbs, fat, fiber
        2. Vitamins (name, amount, unit)
        3. Minerals (name, amount, unit)

        Use ONLY reliable nutrition databases.
        Return ONLY valid JSON, no other text.
      `;

      const result = await this.model.generateContent(prompt);
      const content = result.response.text();
      
      return nutritionAnalysisSchema.parse(JSON.parse(content));
    } catch (error) {
      console.error('Error analyzing nutrition:', error);
      throw new Error('Failed to analyze nutritional content');
    }
  }

  async getPersonalizedRecommendations(
    user: UserProfile,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): Promise<z.infer<typeof mealRecommendationSchema>> {
    try {
      const prompt = `
        Generate a personalized ${mealType} recommendation for:
        
        User Profile:
        - Diet type: ${user.dietType}
        - Goal: ${user.goals?.type}
        - Allergies: ${user.allergies?.join(', ') || 'None'}
        - Dislikes: ${user.dislikedIngredients?.join(', ') || 'None'}
        - Daily calorie target: ${user.goals?.calorieTarget || 2000}
        
        Requirements:
        1. Follow diet type strictly
        2. Avoid all allergens
        3. Exclude disliked ingredients
        4. Balance macronutrients
        5. Include only common ingredients
        6. Provide clear portions
        7. Include cooking instructions
        
        Return ONLY valid JSON matching the schema.
      `;

      const result = await this.model.generateContent(prompt);
      const content = result.response.text();
      
      return mealRecommendationSchema.parse(JSON.parse(content));
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error('Failed to generate meal recommendations');
    }
  }

  async answerNutritionQuestion(question: string): Promise<string> {
    try {
      const prompt = `
        Answer this nutrition question professionally and accurately:
        "${question}"
        
        Requirements:
        1. Use scientific evidence
        2. Be clear and concise
        3. Avoid technical jargon
        4. Include references if relevant
        5. Stay factual, avoid opinions
        
        Format the response in markdown.
      `;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error answering question:', error);
      throw new Error('Failed to answer nutrition question');
    }
  }

  async generateMealPlan(user: UserProfile): Promise<any> {
    try {
      const prompt = `
        Generate a complete meal plan for:
        
        User Profile:
        - Diet type: ${user.dietType}
        - Goal: ${user.goals?.type}
        - Target calories: ${user.goals?.calorieTarget}
        - Allergies: ${user.allergies?.join(', ')}
        - Dislikes: ${user.dislikedIngredients?.join(', ')}
        - Activity level: ${user.goals?.activityLevel}
        
        Requirements:
        1. 5 meals per day
        2. Balanced macronutrients
        3. Variety of foods
        4. Common ingredients only
        5. Clear portions
        6. Include snacks
        7. Consider meal timing
        
        Return a complete meal plan as JSON.
      `;

      const result = await this.model.generateContent(prompt);
      const content = result.response.text();
      
      // Parse and validate response
      const plan = JSON.parse(content);
      
      // Add additional processing here
      
      return plan;
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Failed to generate meal plan');
    }
  }
}