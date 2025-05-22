import { doc, getDoc, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getOpenAIKey } from '../utils/apiKeys';
import { calculateTargetMacros } from './dailyStats';
import { getImage } from '../utils/imageService';
import { updateGoalFromDiet } from '../lib/firebase/goals';
import type { UserProfile, DietPlan, ShoppingList, ShoppingItem } from '../types/user';

// Dias da semana para variação do plano (1=Segunda, 3=Quarta, 5=Sexta)
const RETRY_DELAY = 2000; // 2 seconds between retries
const VARIATION_DAYS = [1, 3, 5]; // Monday, Wednesday, Friday
const PROTEIN_TOLERANCE = 0.20; // 20% tolerance for protein targets
const MAX_RETRIES = 2;
const TIMEOUT = 180000; // 180 seconds
const MEAL_PROTEIN_RATIOS = {
  breakfast: 0.25,  // 25% of daily protein
  lunch: 0.35,      // 35% of daily protein
  snack: 0.10,      // 10% of daily protein
  dinner: 0.25      // 25% of daily protein
};

// Helper function to check if two dates are the same day (exported for reuse)
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

// Helper function to validate meal plan structure
function validateMealPlan(plan: any, macros: { proteinTarget: number; carbsTarget: number; fatTarget: number }, attempt: number = 0, dietType: string = 'omnivoro'): void {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Resposta inválida do serviço. Tente novamente.');
  }

  // Validate meal count based on protein target
  const expectedMealCount = macros.proteinTarget >= 150 ? 5 : 4;
  if (plan.meals.length !== expectedMealCount) {
    throw new Error(`Plano alimentar inválido: necessário ${expectedMealCount} refeições.`);
  }

  if (!Array.isArray(plan.meals)) {
    throw new Error('Plano alimentar inválido: refeições não encontradas');
  }
  
  if (plan.meals.length < 4) {
    throw new Error('Plano alimentar inválido: mínimo de 4 refeições necessário');
  }

  // Listas de alimentos incompatíveis com dietas vegetarianas e veganas
  const nonVegetarianFoods = ['frango', 'carne', 'bovina', 'suína', 'peixe', 'atum', 'salmão', 'sardinha', 'bacon', 'presunto', 'salsicha', 'linguiça', 'costela', 'filé'];
  const nonVeganFoods = [...nonVegetarianFoods, 'leite', 'queijo', 'iogurte', 'requeijão', 'manteiga', 'ovo', 'mel', 'whey'];
  
  // Verificar alimentos incompatíveis com a dieta selecionada
  const incompatibleFoods: string[] = [];
  plan.meals.forEach((meal: any, index: number) => {
    if (Array.isArray(meal.foods)) {
      meal.foods.forEach((food: any) => {
        if (food?.name) {
          const foodName = food.name.toLowerCase();
          
          if (dietType === 'vegano') {
            // Verificar se algum alimento não vegano está presente
            if (nonVeganFoods.some(nonVegan => foodName.includes(nonVegan))) {
              incompatibleFoods.push(`${food.name} (não vegano) na refeição ${meal.name}`);
            }
          } else if (dietType === 'vegetariano') {
            // Verificar se algum alimento não vegetariano está presente
            if (nonVegetarianFoods.some(nonVeg => foodName.includes(nonVeg))) {
              incompatibleFoods.push(`${food.name} (não vegetariano) na refeição ${meal.name}`);
            }
          }
        }
      });
    }
  });
  
  // Se houver alimentos incompatíveis, lançar erro
  if (incompatibleFoods.length > 0) {
    throw new Error(`Plano alimentar contém alimentos incompatíveis com a dieta ${dietType}: ${incompatibleFoods.join(', ')}`);
  }

  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const mealProteinTargets = {
    'café da manhã': macros.proteinTarget * MEAL_PROTEIN_RATIOS.breakfast,
    'almoço': macros.proteinTarget * MEAL_PROTEIN_RATIOS.lunch,
    'lanche': macros.proteinTarget * MEAL_PROTEIN_RATIOS.snack,
    'pré-treino': macros.proteinTarget * 0.15,
    'jantar': macros.proteinTarget * MEAL_PROTEIN_RATIOS.dinner
  };

  plan.meals.forEach((meal: any, index: number) => {
    if (!meal.name || !Array.isArray(meal.foods) || meal.foods.length === 0) {
      throw new Error(`Refeição ${meal.name || `${index + 1}`} inválida: dados incompletos.`);
    }

    const mealName = meal.name.toLowerCase();
    let targetProtein = 0;
    
    // Get protein target based on meal type
    targetProtein = Object.entries(mealProteinTargets)
      .find(([key]) => mealName.includes(key))?.[1] || macros.proteinTarget * 0.15;

    // Calculate meal totals
    const mealProtein = meal.foods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0);
    const mealCalories = meal.foods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0);
    const mealCarbs = meal.foods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0);
    const mealFat = meal.foods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0);

    // Check if protein is within 20% of target
    const minProtein = targetProtein * 0.8;
    if (mealProtein < minProtein) {
      if (attempt < MAX_RETRIES - 1) {
        // Try to adjust protein content
        const proteinDiff = targetProtein - mealProtein;
        const proteinFoods = meal.foods.filter((f: any) => f.protein > 0);
        
        if (proteinFoods.length > 0) {
          // Distribute additional protein among protein foods
          const adjustment = proteinDiff / proteinFoods.length;
          proteinFoods.forEach((food: any) => {
            const factor = (food.protein + adjustment) / food.protein;
            food.protein = Math.round(food.protein * factor * 10) / 10;
            food.calories = Math.round(food.calories * factor);
            food.carbs = Math.round(food.carbs * factor * 10) / 10;
            food.fat = Math.round(food.fat * factor * 10) / 10;
            
            // Update portion
            const match = food.portion.match(/(\d+)(\D+)/);
            if (match) {
              const amount = parseInt(match[1]);
              food.portion = `${Math.round(amount * factor)}${match[2]}`;
            }
          });
          
          // Recalculate meal totals
          meal.protein = meal.foods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0);
          meal.calories = meal.foods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0);
          meal.carbs = meal.foods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0);
          meal.fat = meal.foods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0);
        } else {
          throw new Error(`Proteína insuficiente em ${meal.name} (${Math.round(mealProtein)}g). Meta: ${Math.round(targetProtein)}g.`);
        }
      } else {
        throw new Error(`Proteína insuficiente em ${meal.name} (${Math.round(mealProtein)}g). Meta: ${Math.round(targetProtein)}g.`);
      }
    }

    totalProtein += mealProtein;
    totalCalories += mealCalories;
    totalCarbs += mealCarbs;
    totalFat += mealFat;

    meal.foods.forEach((food: any, foodIndex: number) => {
      if (!food.name || !food.portion || typeof food.calories !== 'number') {
        throw new Error(`Alimento ${foodIndex + 1} da refeição ${index + 1} inválido.`);
      }
    });
  });

  // Validate total protein within ±10% of target
  const minProtein = macros.proteinTarget * (1 - PROTEIN_TOLERANCE);
  const maxProtein = macros.proteinTarget * (1 + PROTEIN_TOLERANCE);
  const totalProteinPercent = (totalProtein / macros.proteinTarget) * 100;
  
  if (totalProtein < minProtein || totalProtein > maxProtein) {
    if (attempt < MAX_RETRIES - 1) {
      // Adjust protein content
      const proteinDiff = macros.proteinTarget - totalProtein;
      const adjustment = proteinDiff / plan.meals.length;
      
      plan.meals.forEach((meal: any) => {
        if (meal.foods.length > 0) {
          // Find highest protein food in meal
          const highestProteinFood = meal.foods.reduce((prev: any, curr: any) => 
            (curr.protein || 0) > (prev.protein || 0) ? curr : prev
          );
          
          // Adjust portion and macros
          const factor = (highestProteinFood.protein + adjustment) / highestProteinFood.protein;
          highestProteinFood.protein = Math.round(highestProteinFood.protein * factor);
          highestProteinFood.calories = Math.round(highestProteinFood.calories * factor);
          highestProteinFood.carbs = Math.round(highestProteinFood.carbs * factor);
          highestProteinFood.fat = Math.round(highestProteinFood.fat * factor);
          
          // Update portion text
          const match = highestProteinFood.portion.match(/(\d+)(\D+)/);
          if (match) {
            const amount = parseInt(match[1]);
            highestProteinFood.portion = `${Math.round(amount * factor)}${match[2]}`;
          }
        }
      });
      
      // Recalculate meal totals
      plan.meals.forEach((meal: any) => {
        meal.protein = meal.foods.reduce((sum: number, food: any) => sum + (food.protein || 0), 0);
        meal.calories = meal.foods.reduce((sum: number, food: any) => sum + (food.calories || 0), 0);
        meal.carbs = meal.foods.reduce((sum: number, food: any) => sum + (food.carbs || 0), 0);
        meal.fat = meal.foods.reduce((sum: number, food: any) => sum + (food.fat || 0), 0);
      });
      
      // Retry validation
      return validateMealPlan(plan, macros, attempt + 1, dietType);
    }
    
    throw new Error(`Proteína fora do intervalo aceitável (${Math.round(totalProtein)}g = ${Math.round(totalProteinPercent)}% do alvo ${macros.proteinTarget}g). Deve estar entre ${Math.round(minProtein)}g e ${Math.round(maxProtein)}g.`);
  }
}

// Generate shopping list from meal plans
async function generateShoppingList(plans: Record<string, DietPlan>): Promise<ShoppingList> {
  const items: Record<string, ShoppingItem> = {};
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const weekEndDate = endDate.toISOString().split('T')[0];

  // Process each plan's meals
  Object.entries(plans).forEach(([date, plan]) => {
    plan.meals.forEach(meal => {
      meal.foods.forEach(food => {
        // Extrair quantidade e unidade da porção
        let amount = 1;
        let unit = 'unidade';
        
        try {
          const result = parsePortionString(food.portion);
          amount = result.amount;
          unit = result.unit;
        } catch (error) {
          console.warn(`Erro ao analisar porção "${food.portion}" para ${food.name}:`, error);
        }
        
        const category = getCategoryForFood(food.name);
        const key = `${food.name}_${unit}`;

        if (items[key]) {
          // Update existing item
          const currentAmount = parseFloat(items[key].quantity);
          // Acumular quantidades para a semana
          items[key].quantity = (currentAmount + amount).toString();
          items[key].mealIds.push(meal.id);
        } else {
          // Add new item
          items[key] = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: food.name.trim(),
            // Multiplicar a quantidade por 7 para ter uma estimativa semanal
            // ou pelo número de dias no plano se houver mais de um dia
            quantity: (amount * (Object.keys(plans).length > 1 ? Object.keys(plans).length : 7)).toString(),
            unit: unit || 'unidade',
            category,
            checked: false,
            mealIds: [meal.id],
            addedAt: today,
            notes: `Quantidade para ${Object.keys(plans).length > 1 ? Object.keys(plans).length : 7} dias`
          };
        }
      });
    });
  });

  return {
    id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: Object.values(plans)[0].userId,
    name: 'Lista de Compras Semanal',
    description: 'Quantidades calculadas para a semana inteira',
    startDate: Object.keys(plans)[0],
    endDate: Object.keys(plans).length > 1 ? 
      Object.keys(plans)[Object.keys(plans).length - 1] : 
      weekEndDate,
    items: Object.values(items),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Generate future meal plans
async function generateFuturePlans(
  user: UserProfile,
  basePlan: DietPlan,
  days: number = 15
): Promise<Record<string, DietPlan>> {
  const plans: Record<string, DietPlan> = {};
  const startDate = new Date();
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate variations of the base plan
    const newPlan: DietPlan = {
      ...basePlan,
      id: `plan_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      meals: await Promise.all((basePlan.meals ?? []).map(async meal => {
        // Vary foods while maintaining macros
        const newFoods = await Promise.all((meal.foods ?? []).map(async food => {
          // Get alternative foods with similar macros
          const alternatives = food.alternatives ?? [];
          if (alternatives.length > 0) {
            const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
            const images = await getImage(`${randomAlt.name} food plated`, false);
            return {
              ...randomAlt,
              id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              imageUrl: images.imageUrl,
              thumbnailUrl: images.thumbnailUrl
            };
          }
          return food;
        }));

        return {
          ...meal,
          id: `meal_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          foods: newFoods ?? []
        };
      }))
    };

    plans[dateStr] = newPlan;
  }

  return plans;
}

// Helper function to parse portion strings
function parsePortionString(portion: string): { amount: number; unit: string } {
  const match = portion.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!match) {
    // Tentar extrair apenas números
    const numMatch = portion.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      return { 
        amount: parseFloat(numMatch[1]), 
        unit: portion.replace(numMatch[1], '').trim() || 'unidade' 
      };
    }
    return { amount: 1, unit: 'unidade' };
  }
  return { 
    amount: parseFloat(match[1]), 
    unit: match[2] || 'unidade'
  };
}

// Helper function to determine food category
function getCategoryForFood(foodName: string): string {
  const categories = {
    carnes: ['frango', 'carne', 'peixe', 'atum', 'sardinha'],
    graos: ['arroz', 'feijão', 'quinoa', 'aveia'],
    vegetais: ['alface', 'tomate', 'cenoura', 'brócolis'],
    frutas: ['maçã', 'banana', 'laranja', 'morango'],
    laticinios: ['leite', 'queijo', 'iogurte', 'requeijão'],
    outros: []
  };

  const normalizedName = foodName.toLowerCase();
  for (const [category, foods] of Object.entries(categories)) {
    if (foods.some(food => normalizedName.includes(food))) {
      return category;
    }
  }
  return 'outros';
}

// Main function to generate meals
async function generateMeals(user: UserProfile): Promise<DietPlan> {
  if (!user.uid) {
    throw new Error('Faça login para gerar um plano alimentar.');
  }

  if (!user.weight || !user.height || !user.age || !user.gender) {
    throw new Error('Complete seu perfil antes de gerar um plano alimentar.');
  }

  if (!user.goals?.type) {
    throw new Error('Configure suas metas antes de gerar um plano alimentar.');
  }

  if (!user.dietType) {
    throw new Error('Selecione um tipo de dieta no seu perfil.');
  }

  const calories = calculateDailyCalories(user);
  const macros = calculateTargetMacros(calories, user.goals.type);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const BACKOFF_FACTOR = 1.5;

  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new Error('Serviço temporariamente indisponível. Entre em contato com o suporte.');
    }

    let response;
    let attempt = 0;
    const prompt = generatePrompt(user, calories, macros);
    // Adicionar log do prompt final
    console.log("--- PROMPT ENVIADO PARA API ---");
    console.log(prompt);
    console.log("-------------------------------");

    while (attempt < MAX_RETRIES) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          throw new Error('O serviço está demorando para responder. Por favor, aguarde alguns segundos e tente novamente.');
        }, TIMEOUT);

        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: `You are a professional nutritionist. Return ONLY a valid JSON object with exactly ${macros.proteinTarget >= 150 ? '5' : '4'} meals following the specified format. No additional text or formatting.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: "json_object" }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
          }
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
          throw new Error('Resposta inválida da API OpenAI');
        }
        
        let content = data.choices[0].message.content;

        let plan;
        try {
          // Clean the content string
          const cleanContent = content.trim();
          
          // Try to find valid JSON in the response
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('Resposta não contém JSON válido');
          }
          
          plan = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('JSON parse error:', {
            error: parseError,
            content: content
          });
          
          // More specific error message based on parse error
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
          if (errorMessage.includes('Unexpected end')) {
            throw new Error('Resposta incompleta do serviço. Tente novamente.');
          } else if (errorMessage.includes('position')) {
            throw new Error('Erro de sintaxe na resposta. Tente novamente.');
          } else {
            throw new Error('Erro ao processar resposta do serviço. Tente novamente.');
          }
        }

        // Validate plan structure
        if (!plan || !plan.meals || !Array.isArray(plan.meals)) {
          throw new Error('Estrutura do plano alimentar incompleta. Tente novamente.');
        }

        // Validate each meal has required fields
        for (const meal of plan.meals) {
          if (!meal.name || !meal.time || !Array.isArray(meal.foods)) {
            throw new Error(`Dados incompletos na refeição "${meal.name || 'sem nome'}". Tente novamente.`);
          }
          // Validate each food item
          for (const food of meal.foods) {
            if (!food.name || !food.portion || 
                typeof food.calories !== 'number' ||
                typeof food.protein !== 'number' ||
                typeof food.carbs !== 'number' ||
                typeof food.fat !== 'number') {
              const missing = [];
              if (!food.name) missing.push('nome');
              if (!food.portion) missing.push('porção');
              if (typeof food.calories !== 'number') missing.push('calorias');
              if (typeof food.protein !== 'number') missing.push('proteína');
              if (typeof food.carbs !== 'number') missing.push('carboidratos');
              if (typeof food.fat !== 'number') missing.push('gordura');
              
              throw new Error(
                `Dados incompletos no alimento "${food.name || 'sem nome'}" ` +
                `(faltando: ${missing.join(', ')}). Tente novamente.`
              );
            }
            // Ensure all numeric values are valid
            food.calories = Math.max(0, Math.round(food.calories));
            food.protein = Math.max(0, Math.round(food.protein * 10) / 10);
            food.carbs = Math.max(0, Math.round(food.carbs * 10) / 10);
            food.fat = Math.max(0, Math.round(food.fat * 10) / 10);
          }
        }

        validateMealPlan(plan, macros, attempt, user.dietType);

        // Add images to meals and foods
        const mealsWithImages = await Promise.all(
          plan.meals.map(async (meal: any, index: number) => {
            const mealImages = await getImage(`${meal.name} gourmet plated dish`, false);
            
            const foodsWithImages = await Promise.all(
              meal.foods.map(async (food: any) => {
                const foodImages = await getImage(`${food.name} gourmet plated dish`, false);
                return {
                  ...food,
                  id: `food_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  imageUrl: foodImages.imageUrl,
                  thumbnailUrl: foodImages.thumbnailUrl
                };
              })
            );

            return {
              ...meal,
              id: `meal_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              imageUrl: mealImages.imageUrl,
              thumbnailUrl: mealImages.thumbnailUrl,
              foods: foodsWithImages
            };
          })
        );

        const finalPlan: DietPlan = {
          id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          completedOnboarding: user.completedOnboarding || false,
          totalCalories: calories,
          proteinTarget: macros.proteinTarget,
          carbsTarget: macros.carbsTarget,
          fatTarget: macros.fatTarget,
          meals: mealsWithImages,
          dailyStats: {
            caloriesConsumed: 0,
            proteinConsumed: 0,
            carbsConsumed: 0,
            fatConsumed: 0,
            waterIntake: 0,
            completedMeals: { [new Date().toISOString().split('T')[0]]: [] },
            lastUpdated: new Date().toISOString()
          }
        };

        // Generate future plans
        const futurePlans = await generateFuturePlans(user, finalPlan);
        finalPlan.nextPlans = futurePlans;

        // Generate shopping list
        const shoppingList = await generateShoppingList({
          [new Date().toISOString().split('T')[0]]: finalPlan,
          ...futurePlans
        });

        // Update user document
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          currentDietPlan: finalPlan,
          lastPlanGenerated: new Date().toISOString(),
          shoppingList,
          updatedAt: new Date().toISOString()
        });

        return finalPlan;
      } catch (error) {
        attempt++;
        
        if (error instanceof Error) {
          // Don't retry certain errors
          if (error.message.includes('API key') || error.message.includes('invalid')) {
            throw new Error('Chave da API OpenAI inválida. Verifique o arquivo .env');
          }
          
          // Handle timeout errors
          if (error.name === 'AbortError') {
            throw new Error('O serviço está demorando para responder. Por favor, aguarde alguns segundos e tente novamente.');
          }
        }

        // If we've exhausted all retries, throw the error
        if (attempt === MAX_RETRIES) {
          throw new Error('Erro de conexão. Verifique sua internet e aguarde alguns segundos antes de tentar novamente.');
        }

        // Wait before retrying with exponential backoff
        const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        continue;
      }
    }

    if (!content) {
      throw new Error('Falha ao obter resposta da API após múltiplas tentativas.');
    }

    return finalPlan;
  } catch (error) {
    console.error('Error generating meal plan:', error);
    throw error;
  }
}

// Helper function to calculate daily calories
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

  // Activity factor
  let activityFactor = 1.2; // Sedentary
  switch (user.goals.activityLevel) {
    case 'light':
      activityFactor = 1.375;
      break;
    case 'moderate':
      activityFactor = 1.55;
      break;
    case 'active':
      activityFactor = 1.725;
      break;
    case 'very_active':
      activityFactor = 1.9;
      break;
  }

  let tdee = bmr * activityFactor;

  // Ajuste para maternidade (gravidez/amamentação)
  if (user.gender === 'feminino' && user.lifeContext === 'maternity') {
    // Adiciona calorias extras para gestantes ou lactantes
    // Valores baseados em recomendações nutricionais padrão
    const maternityAddition = 300; // Adicional mínimo de 300 kcal para gestantes/lactantes
    tdee += maternityAddition;
    
    // Se estiver em dieta de perda de peso, ajusta para garantir que seja seguro
    if (user.goals.type === 'loss') {
      // Limita o déficit para garantir nutrição adequada durante gestação/lactação
      // Déficit máximo de 10% para maternidade
      const maxDeficit = 0.10;
      tdee *= (1 - maxDeficit);
    }
  } else {
    // Adjust for goal (for non-maternity cases)
    switch (user.goals.type) {
      case 'loss':
        const bmi = user.weight / ((user.height / 100) ** 2);
        let deficit = 0.15; // Default 15% deficit
        
        // Adjust deficit based on BMI and weight goal
        if (user.goals.targetWeight) {
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
        
        if (user.goals.targetWeight) {
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
  }

  // Ensure minimum safe calories
  // Para maternidade aumentamos o mínimo seguro de calorias
  let minCalories = user.gender === 'masculino' ? 1500 : 1200;
  if (user.gender === 'feminino' && user.lifeContext === 'maternity') {
    minCalories = 1800; // Mínimo mais alto para mulheres em situação de maternidade
  }
  
  const baseCalories = Math.max(Math.round(tdee), minCalories);
  
  // Apply variation if it's a variation day
  return Math.round(baseCalories * (1 + variationFactor));
}

// Helper function to generate prompt
function generatePrompt(user: UserProfile, calories: number, macros: { proteinTarget: number; carbsTarget: number; fatTarget: number }): string {
  // Adicionar log para verificar as preferências recebidas
  console.log("--- PREFERÊNCIAS RECEBIDAS EM generatePrompt ---");
  console.log(user.foodPreferences);
  console.log("---------------------------------------------");
  
  const foodPreferences = user.foodPreferences || {};
  const likedFoods = Object.entries(foodPreferences)
    .filter(([_, pref]) => pref.type === 'like')
    .sort((a, b) => b[1].score - a[1].score)
    .map(([_, pref]) => `- ${pref.name} (score: ${pref.score})`)
    .join('\n');
  
  const dislikedFoods = Object.entries(foodPreferences)
    .filter(([_, pref]) => pref.type === 'dislike')
    .sort((a, b) => a[1].score - b[1].score)
    .map(([_, pref]) => `- ${pref.name} (score: ${pref.score}, evitar totalmente)`)
    .join('\n');

  // Mapear preferência de orçamento para texto descritivo
  let budgetText = '';
  if (user.budgetPreference) {
    switch (user.budgetPreference) {
      case 'low':
        budgetText = 'Econômico (foco em alimentos acessíveis e de baixo custo)';
        break;
      case 'medium':
        budgetText = 'Moderado (equilíbrio entre custo e qualidade)';
        break;
      case 'high':
        budgetText = 'Premium (prioridade em alimentos de alta qualidade)';
        break;
    }
  }

  // Verificar contexto de maternidade
  const isMaternity = user.lifeContext === 'maternity';
  const maternityText = isMaternity ? 'Sim (gestante ou amamentando)' : 'Não';

  // Instruções específicas para cada tipo de dieta
  let dietInstructions = '';
  if (user.dietType === 'vegano') {
    dietInstructions = `
REGRAS PARA DIETA VEGANA - MUITO IMPORTANTE:
- NUNCA inclua qualquer alimento de origem animal
- PROIBIDO: carnes, peixes, frutos do mar, leite, queijos, iogurte, ovos, mel
- SUBSTITUA proteínas animais por: tofu, seitan, tempeh, leguminosas (feijão, lentilha, grão-de-bico)
- SUBSTITUA laticínios por alternativas vegetais (leite de amêndoas, queijo vegano, iogurte de coco)
- SUBSTITUA ovos por alternativas vegetais em receitas (tofu, farinha de grão-de-bico, banana, chia)
- ATENÇÃO: Verifique cada alimento para garantir que é 100% vegano
- GARANTA fonte adequada de: B12, ferro, cálcio, zinco, ômega-3 (sementes de linhaça/chia)
`;
  } else if (user.dietType === 'vegetariano') {
    dietInstructions = `
REGRAS PARA DIETA VEGETARIANA - MUITO IMPORTANTE:
- NUNCA inclua carnes de qualquer tipo (bovina, aves, peixes, frutos do mar)
- PERMITIDO: ovos, leite, queijos e derivados lácteos
- SUBSTITUA proteínas animais por: ovos, laticínios, tofu, leguminosas (feijão, lentilha, grão-de-bico)
- PRIORIZE proteínas vegetais completas ou combinações complementares
- ATENÇÃO: Verifique cada alimento para garantir que não contém derivados de carne
`;
  } else if (user.dietType === 'low-carb') {
    dietInstructions = `
REGRAS PARA DIETA LOW-CARB:
- LIMITE carboidratos a ${Math.round(macros.carbsTarget)}g por dia
- EVITE: açúcares, amidos, grãos refinados, cereais, tubérculos
- PRIORIZE: proteínas magras, gorduras saudáveis, vegetais de baixo índice glicêmico
- CARBOIDRATOS permitidos apenas em pequenas quantidades e de fontes complexas
- ATENÇÃO às porções de frutas (escolha as menos ricas em açúcar)
`;
  } else if (user.dietType === 'cetogenica') {
    dietInstructions = `
REGRAS PARA DIETA CETOGÊNICA:
- LIMITE RIGOROSO de carboidratos: máximo 30g por dia (ESSENCIAL)
- ALTA proporção de gorduras: cerca de 70-75% das calorias diárias
- PROTEÍNAS moderadas: cerca de 20-25% das calorias diárias
- EVITE TOTALMENTE: açúcares, grãos, leguminosas, tubérculos, frutas açucaradas
- PRIORIZE: carnes, peixes, ovos, queijos, abacate, óleos, manteiga, nozes
- INCLUA vegetais de baixo carboidrato (folhosos verdes)
- MONITORE rigorosamente o teor de carboidratos de cada alimento
`;
  } else if (user.dietType === 'mediterranea') {
    dietInstructions = `
REGRAS PARA DIETA MEDITERRÂNEA:
- BASE: azeite de oliva extra virgem, vegetais, frutas, grãos integrais, leguminosas
- PROTEÍNAS: peixes e frutos do mar frequentemente, aves e ovos com moderação
- LIMITE: carnes vermelhas, açúcares refinados
- INCLUA: nozes, sementes, ervas e especiarias frescas
- PRIORIZE: alimentos integrais e minimamente processados
- MANTENHA a proporção adequada entre ômega-3 e ômega-6
`;
  }

  return `
Você é um nutricionista profissional brasileiro gerando um plano alimentar personalizado.
RETORNE APENAS O JSON SOLICITADO, SEM TEXTO ADICIONAL E SEM FORMATAÇÃO MARKDOWN.
IMPORTANTE: TODAS AS REFEIÇÕES E ALIMENTOS DEVEM ESTAR EM PORTUGUÊS DO BRASIL.

METAS NUTRICIONAIS:
Meta calórica: ${calories} kcal/dia
Meta de proteína: ${macros.proteinTarget}g (${Math.round((macros.proteinTarget * 4 / calories) * 100)}% das calorias)
Meta de carboidratos: ${macros.carbsTarget}g (${Math.round((macros.carbsTarget * 4 / calories) * 100)}% das calorias)
Meta de gorduras: ${macros.fatTarget}g (${Math.round((macros.fatTarget * 9 / calories) * 100)}% das calorias)
Meta de fibras: ${Math.round(calories / 1000 * 14)}g (14g/1000kcal)

PERFIL DO USUÁRIO:
Peso: ${user.weight}kg
Altura: ${user.height}cm
Idade: ${user.age} anos
Gênero: ${user.gender}
IMC: ${Math.round((user.weight / Math.pow(user.height/100, 2)) * 10) / 10}
Preferência de orçamento: ${budgetText || 'Não especificado'}
Maternidade: ${maternityText}

PREFERÊNCIAS DO USUÁRIO:
Alimentos preferidos:
${likedFoods || '- Nenhum preferido'}
Alimentos não desejados:
${dislikedFoods || '- Nenhum não desejado'}
Alergias: ${user.allergies?.join(', ') || 'Nenhuma'}
Tipo de dieta: ${user.dietType}
Objetivo: ${user.goals.type === 'loss' ? 'Emagrecimento' : user.goals.type === 'gain' ? 'Ganho de massa' : 'Manutenção'}
Nível de atividade: ${user.goals?.activityLevel || 'moderado'}

${dietInstructions}

${isMaternity ? `REGRAS PARA MATERNIDADE:
- PRIORIZE alimentos ricos em ferro, cálcio, ácido fólico e ômega-3
- EVITE alimentos crus, defumados, curados ou mal cozidos
- AUMENTE a ingestão de líquidos e fibras
- EVITE cafeína em excesso e álcool totalmente
- DISTRIBUA as calorias em refeições menores e mais frequentes
- INCLUA laticínios e fontes de proteína de alta qualidade

` : ''}

${user.budgetPreference === 'low' ? `REGRAS PARA ORÇAMENTO ECONÔMICO:
- PRIORIZE alimentos sazonais e da safra atual
- PREFIRA cortes de proteína mais acessíveis (sobrecoxa, acém, ovo)
- UTILIZE leguminosas como fonte complementar de proteínas
- PRIORIZE compras a granel para cereais e grãos
- SUBSTITUA ingredientes caros por alternativas acessíveis
- MAXIMIZE uso de vegetais de baixo custo (abóbora, repolho, cenoura)

` : ''}

REGRAS DE REFEIÇÕES:
Café da Manhã (07:00):
- OBRIGATÓRIO: proteína (${user.dietType === 'vegano' ? 'tofu, pasta de grão-de-bico, leite vegetal enriquecido' : user.dietType === 'vegetariano' ? 'ovo, iogurte, queijo, whey' : 'ovo, iogurte, whey, queijo'}) - MÍNIMO ${Math.round(macros.proteinTarget * 0.20)}g
- OBRIGATÓRIO: carboidrato complexo (aveia, pão integral, tapioca)
- OBRIGATÓRIO: fruta (vitaminas, minerais e fibras)
- PROIBIDO: doces, sobremesas, alimentos muito gordurosos ou processados

Almoço (12:00):
- OBRIGATÓRIO: proteína ${user.dietType === 'vegano' ? 'vegetal (tofu, tempeh, leguminosas)' : user.dietType === 'vegetariano' ? 'vegetal ou ovo' : 'magra (frango, peixe, carne magra)'} - MÍNIMO ${Math.round(macros.proteinTarget * 0.30)}g
- OBRIGATÓRIO: carboidrato complexo (arroz integral, quinoa)
- OBRIGATÓRIO: legumes e verduras (2-3 tipos diferentes)
- OBRIGATÓRIO: gordura boa (azeite, abacate)

Lanche (16:00):
- OBRIGATÓRIO: proteína (${user.dietType === 'vegano' ? 'pasta de grão-de-bico, tofu, proteína vegetal' : user.dietType === 'vegetariano' ? 'iogurte, queijo, whey vegetariano' : 'iogurte, whey, queijo'}) - MÍNIMO ${Math.round(macros.proteinTarget * 0.10)}g
- OBRIGATÓRIO: carboidrato complexo ou fruta
- OBRIGATÓRIO: gordura boa (castanhas, amêndoas)
- EVITAR: alimentos processados e açúcares simples

Jantar (20:00):
- OBRIGATÓRIO: proteína ${user.dietType === 'vegano' ? 'vegetal (similar ao almoço)' : user.dietType === 'vegetariano' ? 'vegetal ou ovo (similar ao almoço)' : 'magra (similar ao almoço)'} - MÍNIMO ${Math.round(macros.proteinTarget * 0.20)}g
- OBRIGATÓRIO: legumes e verduras em abundância
- REDUZIR: carboidratos (exceto se objetivo for ganho)
- EVITAR: carboidratos refinados e gorduras saturadas

HORÁRIOS OBRIGATÓRIOS:
- Café da manhã: 07:00
- Almoço: 12:00
- Lanche: 16:00
${macros.proteinTarget >= 150 ? '- Pré-Treino: 18:00\n' : ''}- Jantar: ${macros.proteinTarget >= 150 ? '21:00' : '20:00'}

IMPORTANTE:
+ GARANTA A MÁXIMA VARIEDADE POSSÍVEL nos alimentos sugeridos ao longo do dia e entre os dias, se aplicável.
- Use APENAS alimentos comuns e acessíveis no Brasil
- NUNCA repita o mesmo alimento principal (ex: frango, arroz) em refeições diferentes NO MESMO DIA. Varie as fontes.
- PRIORIZE os alimentos preferidos do usuário (score positivo)
- EVITE TOTALMENTE os alimentos não desejados (score negativo)
- DISTRIBUA proteínas ao longo do dia
- INCLUA fibras em todas as refeições (mínimo 3g por refeição)
- PRIORIZE gorduras boas (azeite, abacate, castanhas)
- INCLUA vegetais coloridos para variedade nutricional
- Ao substituir um alimento não desejado, use alternativas variadas e nutricionalmente similares, não sempre a mesma substituição.
- Priorize SEMPRE alimentos naturais e frescos
- Controle o sódio diário (máx 2000mg) e use temperos naturais
- VARIE fontes de proteína (animal/vegetal conforme dieta)
- VARIE cores dos vegetais (verde escuro, laranja, vermelho)
- USE medidas caseiras precisas (colher, xícara, unidade)
- AJUSTE porções para atingir metas de macros
${user.budgetPreference === 'high' ? `- INCLUA alimentos premium de alta qualidade nutricional
- CONSIDERE superalimentos e ingredientes funcionais` : ''}

REGRAS ADICIONAIS:
1. DISTRIBUA calorias: 25-30% café, 30-35% almoço, 15-20% lanche, 20-25% jantar
2. MANTENHA proteína alta: mínimo 20g por refeição principal
3. INCLUA fibras: mínimo 3g por refeição
4. NUNCA use nomes de alimentos em inglês, SEMPRE em português do Brasil
5. PRIORIZE nutrientes: vitaminas, minerais e antioxidantes
6. AJUSTE carboidratos: mais pela manhã/pós-treino, menos à noite
7. EQUILIBRE gorduras: priorize mono e poli-insaturadas
8. HIDRATE alimentos: considere água/líquidos nas refeições

RETORNE O JSON NO SEGUINTE FORMATO:
{
  "meals": [
    {
      "name": "Café da Manhã",
      "time": "07:00",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "foods": [
        {
          "name": "Nome do Alimento",
          "portion": "Porção em medida caseira",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      ]
    },
    {
      "name": "Almoço",
      "time": "12:00",
      ...
    },
    {
      "name": "Lanche",
      "time": "16:00",
      ...
    },
    ${macros.proteinTarget >= 150 ? `{
      "name": "Pré-Treino",
      "time": "18:00",
      ...
    },` : ''}
    {
      "name": "Jantar", 
      "time": ${macros.proteinTarget >= 150 ? '"21:00"' : '"20:00"'},
      ...
    }
  ]
}`;
}

export { generateMeals, generateFuturePlans, generateShoppingList };