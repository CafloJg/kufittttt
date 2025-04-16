import { doc, getDoc, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { getOpenAIKey } from '../utils/apiKeys';
import { calculateTargetMacros } from './dailyStats';
import { updateGoalFromDiet } from './firebase/goals';
import type { UserProfile, DietPlan } from '../types/user';

// Increased cache duration to reduce API calls
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const RETRY_DELAY = 2000; // 2 seconds between retries
const VARIATION_DAYS = [1, 3, 5]; // Monday, Wednesday, Friday

// Helper function to validate meal plan structure
function validateMealPlan(plan: any): void {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Resposta inválida do serviço. Tente novamente.');
  }

  if (!Array.isArray(plan.meals) || plan.meals.length < 4) {
    throw new Error('Plano alimentar inválido: mínimo de 4 refeições necessário');
  }
  
  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  plan.meals.forEach((meal: any, index: number) => {
    if (!meal.name || !Array.isArray(meal.foods) || meal.foods.length === 0) {
      throw new Error(`Refeição ${meal.name || `${index + 1}`} inválida: dados incompletos.`);
    }

    let mealProtein = 0;
    let mealCalories = 0;

    meal.foods.forEach((food: any, foodIndex: number) => {
      if (!food.name || !food.portion || typeof food.calories !== 'number') {
        throw new Error(`Alimento ${foodIndex + 1} da refeição ${index + 1} inválido.`);
      }
      
      // Validate numeric values
      food.calories = Math.max(0, Math.round(food.calories));
      food.protein = Math.max(0, Math.round(food.protein * 10) / 10);
      food.carbs = Math.max(0, Math.round(food.carbs * 10) / 10);
      food.fat = Math.max(0, Math.round(food.fat * 10) / 10);
      
      mealProtein += food.protein;
      mealCalories += food.calories;
      totalProtein += food.protein;
      totalCalories += food.calories;
      totalCarbs += food.carbs;
      totalFat += food.fat;
    });
    
    // Update meal totals
    meal.protein = Math.round(mealProtein);
    meal.calories = Math.round(mealCalories);
    // Validate minimum protein per meal type
    const minProtein = (() => {
      const mealName = meal.name.toLowerCase();
      if (mealName.includes('pré-treino')) return 25;
      if (mealName.includes('café')) return 25;
      if (mealName.includes('almoço')) return 35;
      if (mealName.includes('lanche')) return 10;
      if (mealName.includes('jantar')) return 30;
      return 10; // Default minimum
    })();

    if (meal.protein < minProtein) {
      throw new Error(`Proteína insuficiente em ${meal.name} (${meal.protein}g). Mínimo: ${minProtein}g por refeição.`);
    }
  });
  
  plan.totalCalories = Math.round(totalCalories);
  plan.proteinTarget = Math.round(totalProtein);
  plan.carbsTarget = Math.round(totalCarbs);
  plan.fatTarget = Math.round(totalFat);
}

// Calculate daily calories based on user profile
function calculateDailyCalories(user: UserProfile): number {
  if (!user.weight || !user.height || !user.age || !user.gender || !user.goals) {
    throw new Error('Dados do usuário incompletos.');
  }

  // Check if today is a variation day
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const isVariationDay = VARIATION_DAYS.includes(today);
  
  // Add calorie variation on specific days
  const variationFactor = isVariationDay ? (Math.random() * 0.2) - 0.1 : 0; // ±10% variation

  // Calculate BMR using Mifflin-St Jeor formula
  let bmr = 0;
  
  if (user.gender === 'masculino') {
    bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5;
  } else {
    bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;
  }

  // Activity factor based on user's activity level and goals
  let activityFactor = 1.2; // Sedentary (little or no exercise)
  switch (user.goals.activityLevel) {
    case 'light':
      activityFactor = 1.375; // Light exercise (1-3 days/week)
      break;
    case 'moderate':
      activityFactor = 1.55; // Moderate exercise (3-5 days/week)
      break;
    case 'active':
      activityFactor = 1.725; // Heavy exercise (6-7 days/week)
      break;
    case 'very_active':
      activityFactor = 1.9; // Very heavy exercise/physical job
      break;
  }

  // Calculate Total Daily Energy Expenditure (TDEE)
  let tdee = bmr * activityFactor;

  // Consider active goals when calculating calories
  const activeGoals = user.goals?.customGoals?.filter(g => g.status === 'active') || [];
  const weightGoal = activeGoals.find(g => g.type === 'weight');
  
  // Adjust calories based on user's goal type and target weight
  switch (user.goals.type) {
    case 'loss':
      const bmi = user.weight / ((user.height / 100) ** 2);
      let deficit = 0.15;
      
      // Adjust deficit based on BMI and weight goal
      if (weightGoal) {
        const weightToLose = user.weight - user.goals.targetWeight;
        const weeklyTarget = bmi > 30 ? 1 : bmi > 25 ? 0.75 : 0.5; // kg/week
        const targetDuration = Math.ceil(weightToLose / weeklyTarget);
        
        // Calculate required deficit for target
        deficit = Math.min(0.25, (weeklyTarget * 7700) / (tdee * 7));
      } else {
        if (bmi > 30) deficit = 0.20;
        else if (bmi < 25) deficit = 0.10;
      }
      
      tdee *= (1 - deficit);
      break;
      
    case 'gain':
      // Calculate surplus based on target weight and experience
      let surplus = 0.10; // Default 10% surplus
      
      if (weightGoal) {
        const weightToGain = user.goals.targetWeight - user.weight;
        const weeklyTarget = 0.5; // Max 0.5kg/week for lean gains
        const targetDuration = Math.ceil(weightToGain / weeklyTarget);
        
        // Adjust surplus based on experience
        const isAdvanced = user.checkInStreak ? user.checkInStreak > 90 : false;
        surplus = isAdvanced ? 0.05 : Math.min(0.15, (weeklyTarget * 7700) / (tdee * 7));
      }
      
      tdee *= (1 + surplus);
      break;
  }

  // Ensure minimum safe calories
  const minCalories = user.gender === 'masculino' ? 1500 : 1200;
  const baseCalories = Math.max(Math.round(tdee), minCalories);
  
  // Apply variation if it's a variation day
  return Math.round(baseCalories * (1 + variationFactor));
}

// Update goals when diet plan changes
async function updateGoalsFromDiet(userId: string, plan: DietPlan) {
  try {
    // Update protein goals
    await updateGoalFromDiet(userId, plan.id, 'protein', 0);
    
    // Update calorie goals  
    await updateGoalFromDiet(userId, plan.id, 'calories', 0);
    
    // Update meal goals
    await updateGoalFromDiet(userId, plan.id, 'meals', 0);
  } catch (error) {
    console.error('Error updating goals from diet:', error);
  }
}

// Cache configuration
const planCache = new Map<string, {
  plan: DietPlan;
  timestamp: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
}>();

// Validation constants
const CALORIE_TOLERANCE = 100; // ±100 kcal
const MACRO_TOLERANCE = 5;    // ±5g for macros
const REQUIRED_MEAL_TIMES = ['07:00', '12:00', '16:00', '20:00'];

// Error handling
const MAX_RETRIES = 3;

// Helper function to get cache key
function getCacheKey(user: UserProfile): string {
  return JSON.stringify({
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    goals: user.goals,
    dietType: user.dietType,
    allergies: user.allergies,
    foodPreferences: user.foodPreferences
  });
}

export async function calculateMacros(ingredients: string[]): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}> {
  if (!ingredients || ingredients.length === 0) {
    throw new Error('Por favor, forneça os ingredientes para calcular os macros.');
  }

  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new Error('Serviço temporariamente indisponível. Entre em contato com o suporte.');
    }

    const prompt = `
      Calcule os macronutrientes para os seguintes alimentos usando a TACO:
      ${ingredients.join('\n')}
      
      IMPORTANTE: 
      1. Para cada alimento, especifique a quantidade exata em gramas ou medidas caseiras
      2. Use APENAS termos em português do Brasil
      3. Nunca use nomes de alimentos em inglês

      Retorne apenas um objeto JSON com este formato exato:
      {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number,
        "portions": [
          {
            "food": string,
            "amount": string,
            "unit": string
          }
        ]
      }

      Regras:
      1. Use APENAS valores da TACO (Tabela Brasileira de Composição de Alimentos)
      2. Para alimentos não encontrados, use valores de alimentos similares
      3. Use APENAS nomes de alimentos em português do Brasil
      4. Especifique SEMPRE a quantidade exata de cada alimento
      5. Use medidas caseiras comuns (colher, xícara, unidade) ou gramas
      6. Arredonde todos os valores para números inteiros
      7. Valores devem ser sempre positivos
      8. Retorne apenas o objeto JSON, sem texto adicional
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista profissional brasileiro. Retorne um JSON válido com a seguinte estrutura: {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}. Use apenas termos em português do Brasil.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300, // Reduced token usage
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Erro da API: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Invalid API response format:", data);
      throw new Error('Erro ao calcular macros. Por favor, tente novamente.');
    }
    
    const cleanJson = data.choices[0].message.content.trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Erro ao processar resposta. Por favor, tente novamente.');
    }

    const macros = JSON.parse(jsonMatch[0]);

    const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'portions'];
    for (const field of requiredFields) {
      if (!(field in macros) || typeof macros[field] !== 'number') {
        if (field === 'portions') {
          if (!Array.isArray(macros.portions)) {
            throw new Error('Campo portions deve ser um array');
          }
          continue;
        }
        throw new Error(`Campo ${field} ausente na resposta`);
      }
      if (typeof macros[field] !== 'number' || macros[field] < 0) {
        throw new Error('Erro ao calcular macros. Por favor, tente novamente.');
      }
    }

    // Validate portions
    if (!macros.portions.every((p: any) => 
      p.food && p.amount && p.unit &&
      typeof p.food === 'string' &&
      typeof p.amount === 'string' &&
      typeof p.unit === 'string'
    )) {
      throw new Error('Formato inválido das porções');
    }

    return {
      calories: Math.round(macros.calories),
      protein: Math.round(macros.protein),
      carbs: Math.round(macros.carbs),
      fat: Math.round(macros.fat),
      fiber: Math.round(macros.fiber),
      portions: macros.portions
    };
  } catch (error) {
    console.error('Erro ao calcular macros:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('rate limit')) {
        throw new Error('Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.');
      }
      if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      throw error;
    }
    throw new Error('Erro ao calcular macros. Por favor, tente novamente.');
  }
}