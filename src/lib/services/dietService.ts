import { z } from 'zod';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { getOpenAIKey } from '../../utils/apiKeys'; 
import { FALLBACK_IMAGES } from '../../utils/imageUtils';
import type { UserProfile, DietPlan, ShoppingList, ShoppingItem } from '../../types/user';
import { withTimeout, withRetry } from '../../utils/timeoutUtils';
import { getDietCompatibleReplacement } from '../../utils/profileValidator';

// Dias da semana para variação do plano (1=Segunda, 3=Quarta, 5=Sexta)
const VARIATION_DAYS = [1, 3, 5];

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const BACKOFF_FACTOR = 2;
const TIMEOUT = 180000; // 3 minutes timeout for individual API calls

export const mealFallbacks = {
  'café': FALLBACK_IMAGES.meal.breakfast,
  'almo': FALLBACK_IMAGES.meal.lunch,
  'lanc': FALLBACK_IMAGES.meal.snack,
  'pré': FALLBACK_IMAGES.meal.preworkout,
  'jant': FALLBACK_IMAGES.meal.dinner
};

// Validation schemas
const foodSchema = z.object({
  name: z.string(),
  portion: z.string(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0)
});

const mealSchema = z.object({
  name: z.string(),
  time: z.string(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  foods: z.array(foodSchema)
});

const planSchema = z.object({
  meals: z.array(mealSchema)
});

export class DietService {
  private static instance: DietService;
  private rateLimitUntil: number = 0;
  private consecutiveFailures: number = 0; 
  private readonly FAILURE_THRESHOLD = 3; // Reduced threshold
  private favoriteMeals: any[] = []; // Array para armazenar refeições favoritas

  private constructor() {}

  static getInstance(): DietService {
    if (!this.instance) {
      this.instance = new DietService();
    }
    return this.instance;
  }

  // Novo método para definir refeições favoritas
  setFavoriteMeals(meals: any[]): void {
    if (!meals || !Array.isArray(meals)) {
      console.warn('setFavoriteMeals recebeu um valor inválido:', meals);
      this.favoriteMeals = [];
      return;
    }
    console.log(`Definindo ${meals.length} refeições favoritas para priorização`);
    this.favoriteMeals = [...meals];
  }

  // Método para incluir refeições favoritas no prompt
  private includeFavoriteMealsInPrompt(prompt: string): string {
    if (!this.favoriteMeals || this.favoriteMeals.length === 0) {
      return prompt;
    }

    // Adicionar seção de refeições favoritas ao prompt
    const favoritesSection = `
REFEIÇÕES FAVORITAS DO USUÁRIO:
${this.favoriteMeals.map((meal, index) => {
  return `Refeição favorita ${index + 1}: ${meal.name}
  - Calorias: ${meal.calories}
  - Proteína: ${meal.protein}g
  - Carboidratos: ${meal.carbs}g
  - Gorduras: ${meal.fat}g
  - Alimentos: ${meal.foods.map((f: any) => `${f.name} (${f.portion})`).join(', ')}
`;
}).join('\n')}

IMPORTANTE: Priorize incluir essas refeições favoritas no plano, adaptando-as conforme necessário para atender aos macronutrientes alvo. SEMPRE inclua pelo menos 2 refeições favoritas, se disponíveis.
`;

    // Inserir a seção de favoritos antes da seção de formato JSON
    const jsonFormatIndex = prompt.indexOf('FORMATO JSON:');
    if (jsonFormatIndex !== -1) {
      return prompt.slice(0, jsonFormatIndex) + favoritesSection + prompt.slice(jsonFormatIndex);
    } else {
      return prompt + "\n\n" + favoritesSection;
    }
  }

  async generateMealPlan(user: UserProfile, signal?: AbortSignal): Promise<DietPlan> {
    console.log('Starting meal plan generation...');
    try {
    this.validateUserProfile(user);
    
    // Verificar se a operação foi cancelada
    if (signal?.aborted) {
      throw new Error('Operação cancelada pelo usuário');
    }

      // Verificar se temos as propriedades necessárias
      if (!user.uid || !user.weight || !user.height || !user.age || !user.gender) {
        console.error('Erro de validação: perfil incompleto', {
          temUid: !!user.uid,
          temPeso: !!user.weight,
          temAltura: !!user.height,
          temIdade: !!user.age,
          temGenero: !!user.gender,
          temDietType: !!user.dietType,
          temGoals: !!user.goals
        });
        throw new Error('Perfil incompleto. Preencha todos os campos obrigatórios.');
      }
      
      // Verificar a estrutura de goals (se existe)
      if (!user.goals) {
        console.error('Erro de validação: objetivos não definidos');
        // Definir um valor padrão para objetivos
        console.log('Usando objetivo padrão: manutenção');
        user = {
          ...user,
          goals: {
            type: 'maintenance' as 'loss' | 'gain' | 'maintenance'
          }
        };
    }
    
    const calories = this.calculateDailyCalories(user);
    const macros = this.calculateTargetMacros(calories, user.goals?.type);

      console.log('Calorias calculadas:', calories);
      console.log('Macros calculados:', macros);

      // Check rate limit
      if (Date.now() < this.rateLimitUntil) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        throw new Error(`Muitas solicitações em pouco tempo. Aguarde ${waitTime} segundos e tente novamente.`);
      }

      console.log('Getting OpenAI API key...');
      const apiKey = await getOpenAIKey();
      let prompt = this.generatePrompt(user, calories, macros);
      
      // Adicionar refeições favoritas ao prompt
      prompt = this.includeFavoriteMealsInPrompt(prompt);
      
      console.log('Generating meal plan...');
      let plan = await this.generatePlanWithRetry(prompt, apiKey, macros, signal);
      console.log('Meal plan generated successfully');
      
      // Skip image generation if using fallbacks
      console.log('Using fallback images for faster generation');
      plan = this.enhancePlanWithFallbackImages(plan);

      // Check if operation was canceled during processing
      if (signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário');
      }
      
      // Validar compatibilidade com a dieta do usuário
      this.validateDietCompatibility(plan, user.dietType || 'omnivoro');
      
      console.log('Plan generated, saving...');
      console.log('Saving plan...');
      const finalPlan = await this.savePlan(user, plan, calories, macros);
      console.log('Plan saved successfully');
      
      this.consecutiveFailures = 0;
      return finalPlan;
    } catch (error) {
      console.error('Erro em generateMealPlan:', error);
      if (error instanceof Error) {
        throw new Error(`Erro ao gerar plano alimentar: ${error.message}`);
      }
      throw new Error('Erro desconhecido ao gerar plano alimentar');
    }
  }

  private validateUserProfile(user: UserProfile): void {
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
  }

  private async generatePlanWithRetry(
    prompt: string, 
    apiKey: string, 
    macros: { proteinTarget: number; carbsTarget: number; fatTarget: number },
    signal?: AbortSignal
  ): Promise<any> {    
    const fetchWithRetry = () => withTimeout(
      (async () => {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  "role": "system",
                  "content": "Você é um nutricionista profissional brasileiro. Retorne APENAS um objeto JSON válido com refeições seguindo o formato especificado. Todos os nomes de alimentos e refeições DEVEM estar em português do Brasil. Não inclua texto adicional ou formatação."
                },
                {
                  "role": "user",
                  "content": prompt
                }
              ],
              "temperature": 0.1,
              "max_tokens": 1500, // Reduced token usage
              "response_format": { "type": "json_object" }
          })
          });

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Muitas solicitações. Aguarde alguns minutos e tente novamente.');
            } else if (response.status === 504 || response.status === 503) {
              throw new Error('O serviço está sobrecarregado. Tente novamente em alguns minutos.');
            }
            const error = await response.json();
            throw new Error(error.error?.message || `API error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;

          if (!content || typeof content !== 'string' || !content.trim()) {
            throw new Error('Resposta inválida do serviço');
          }

          const cleanContent = content.trim();
          const plan = JSON.parse(cleanContent);
          const validatedPlan = planSchema.parse(plan);
          console.log('Plan generated and validated successfully');
          return validatedPlan;
      })(),
      TIMEOUT,
      signal
    );

    // Usar a função withRetry para tentar novamente com backoff
    return withRetry(
      fetchWithRetry,
      {
        maxRetries: MAX_RETRIES,
        initialDelay: RETRY_DELAY,
        backoffFactor: BACKOFF_FACTOR,
        onRetry: (error, attempt, delay) => {
          console.warn(`Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms:`, error);
        },
        shouldRetry: (error) => {
          // Não tentar novamente se a operação foi cancelada pelo usuário
          if (signal?.aborted || (error instanceof Error && error.message.includes('cancelada pelo usuário'))) {
            return false;
          }
          
          // Não tentar novamente se for um erro de timeout
          if (error instanceof Error && error.message.includes('excedeu o tempo limite')) {
            return false;
          }
          
          return true;
        }
      }
    );
  }

  // Use fallback images instead of generating new ones
  private enhancePlanWithFallbackImages(plan: any): any {
    const enhancedMeals = plan.meals.map((meal: any, index: number) => {
      const mealName = meal.name.toLowerCase();
      let mealImage = FALLBACK_IMAGES.food;
      
      // Find the appropriate meal image based on name
      if (mealName.includes('café')) {
        mealImage = FALLBACK_IMAGES.meal.breakfast;
      } else if (mealName.includes('almo')) {
        mealImage = FALLBACK_IMAGES.meal.lunch;
      } else if (mealName.includes('lanc') || mealName.includes('pré')) {
        mealImage = FALLBACK_IMAGES.meal.snack;
      } else if (mealName.includes('jant')) {
        mealImage = FALLBACK_IMAGES.meal.dinner;
      }
      
      const enhancedFoods = meal.foods.map((food: any, foodIndex: number) => ({
        ...food,
        id: `food_${index}_${foodIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: FALLBACK_IMAGES.food.imageUrl,
        thumbnailUrl: FALLBACK_IMAGES.food.thumbnailUrl
      }));

      return {
        ...meal,
        id: `meal_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: mealImage.imageUrl,
        thumbnailUrl: mealImage.thumbnailUrl,
        foods: enhancedFoods
      };
    });

    return { ...plan, meals: enhancedMeals };
  }

  private async savePlan(
    user: UserProfile,
    plan: any,
    calories: number,
    macros: { proteinTarget: number; carbsTarget: number; fatTarget: number }, 
    retryCount: number = 0
  ): Promise<DietPlan> {
    try {
      // Generate a unique ID for the plan
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const finalPlan: DietPlan = {
        id: planId,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        totalCalories: calories,
        proteinTarget: macros.proteinTarget,
        carbsTarget: macros.carbsTarget,
        fatTarget: macros.fatTarget,
        meals: plan.meals,
        lastActive: new Date().toISOString(),
        completedOnboarding: true,
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
  
      // Skip future plans and shopping list generation for faster response
      const futurePlans = {}; // Empty for now, can be generated later
      finalPlan.nextPlans = futurePlans;
  
      // Gerar lista de compras
      const shoppingList = await this.generateShoppingList(user.uid, finalPlan);
  
      // Save everything in a transaction
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('Usuário não encontrado');
        }
        
        transaction.update(userRef, {
          currentDietPlan: finalPlan,
          lastPlanGenerated: new Date().toISOString(),
          shoppingList,
          updatedAt: new Date().toISOString()
        });
      });
  
      return finalPlan;
    } catch (error) {
      console.error('Error saving plan:', error);
      
      // Retry once with a simpler approach if transaction fails
      if (retryCount === 0) {
        console.log('Retrying with simpler save approach...');
        return this.saveWithoutTransaction(user, plan, calories, macros);
      }
      
      throw error;
    }
  }

  // Fallback method to save plan without transaction
  private async saveWithoutTransaction(
    user: UserProfile,
    plan: any,
    calories: number,
    macros: { proteinTarget: number; carbsTarget: number; fatTarget: number }
  ): Promise<DietPlan> {
    const finalPlan: DietPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      totalCalories: calories,
      proteinTarget: macros.proteinTarget,
      carbsTarget: macros.carbsTarget,
      fatTarget: macros.fatTarget,
      meals: plan.meals,
      lastActive: new Date().toISOString(),
      completedOnboarding: true,
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

    // Update user document directly
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      currentDietPlan: finalPlan,
      lastPlanGenerated: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return finalPlan;
  }

  // Gerar lista de compras a partir do plano
  private async generateShoppingList(userId: string, plan: DietPlan): Promise<ShoppingList> {
    const items: ShoppingItem[] = [];
    const processedFoods = new Set<string>();
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Uma semana à frente
    const weekEndDate = endDate.toISOString().split('T')[0];

    plan.meals.forEach(meal => {
      meal.foods.forEach(food => {
        // Skip duplicates
        if (processedFoods.has(food.name.toLowerCase())) return;
        processedFoods.add(food.name.toLowerCase());
        
        // Extrair quantidade e unidade da porção
        let amount = 1;
        let unit = 'unidade';
        
        try {
          const portionMatch = food.portion.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
          if (portionMatch) {
            amount = parseFloat(portionMatch[1]);
            unit = portionMatch[2];
          } else {
            // Tentar extrair apenas números
            const numMatch = food.portion.match(/(\d+(?:\.\d+)?)/);
            if (numMatch) {
              amount = parseFloat(numMatch[1]);
              unit = food.portion.replace(numMatch[1], '').trim() || 'unidade';
            }
          }
        } catch (error) {
          console.warn(`Erro ao analisar porção "${food.portion}" para ${food.name}:`, error);
        }
        
        items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: food.name.trim(),
          // Multiplicar a quantidade por 7 para ter uma estimativa semanal
          quantity: (amount * 7).toString(),
          unit: unit || 'unidade',
          category: this.getCategoryForFood(food.name),
          checked: false,
          mealIds: [meal.id],
          addedAt: today,
          notes: 'Quantidade para 7 dias'
        });
      });
    });
    
    return {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      name: 'Lista de Compras para a Semana',
      description: 'Quantidades calculadas para 7 dias com base no plano alimentar',
      startDate: today,
      endDate: weekEndDate,
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  // Determinar categoria do alimento
  private getCategoryForFood(name: string): string {
    const FOOD_CATEGORIES = {
      PROTEINS: ['frango', 'carne', 'peixe', 'ovo', 'queijo', 'iogurte', 'leite'],
      CARBS: ['arroz', 'pão', 'aveia', 'batata', 'macarrão', 'cereal'],
      VEGETABLES: ['alface', 'brócolis', 'espinafre', 'tomate', 'cenoura', 'abobrinha'],
      FRUITS: ['maçã', 'banana', 'laranja', 'morango', 'abacaxi', 'uva'],
      FATS: ['azeite', 'óleo', 'manteiga', 'castanha', 'abacate', 'coco']
    };

    const lowerName = name.toLowerCase();
    
    if (FOOD_CATEGORIES.PROTEINS.some(food => lowerName.includes(food))) {
      return 'proteínas';
    }
    
    if (FOOD_CATEGORIES.CARBS.some(food => lowerName.includes(food))) {
      return 'carboidratos';
    }
    
    if (FOOD_CATEGORIES.VEGETABLES.some(food => lowerName.includes(food))) {
      return 'vegetais';
    }
    
    if (FOOD_CATEGORIES.FRUITS.some(food => lowerName.includes(food))) {
      return 'frutas';
    }
    
    if (FOOD_CATEGORIES.FATS.some(food => lowerName.includes(food))) {
      return 'gorduras';
    }
    
    return 'outros';
  }

  public handleError(error: unknown): DietPlan {
    this.consecutiveFailures++;
    
    console.log('Erro capturado em handleError:', error);
    
    // Tentar extrair uma mensagem de erro útil
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Erro desconhecido ao gerar plano alimentar";
    
    // Log detalhado para depuração
    console.error('Detalhes do erro em dietService:', {
      message: errorMessage,
      consecutiveFailures: this.consecutiveFailures,
      error
    });
    
    // Criar um plano de emergência para evitar falha total
    const fallbackPlan: DietPlan = {
      id: `emergency_plan_${Date.now()}`,
      userId: 'system',
      createdAt: new Date().toISOString(),
      totalCalories: 2000,
      proteinTarget: 100,
      carbsTarget: 250,
      fatTarget: 70,
      meals: [],
      lastActive: new Date().toISOString(),
      completedOnboarding: true,
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
    
    // Adicionar ao menos uma refeição básica, sem as propriedades imageUrl/thumbnailUrl no nível principal
    fallbackPlan.meals = [
      {
        id: `meal_emergency_1_${Date.now()}`,
        name: "Refeição de Emergência",
        time: "12:00",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
        foods: [
          {
            name: "Opção de Emergência",
            portion: "1 porção",
            calories: 500,
            protein: 30,
            carbs: 60,
            fat: 15,
            imageUrl: FALLBACK_IMAGES.food.imageUrl,
            thumbnailUrl: FALLBACK_IMAGES.food.thumbnailUrl
          }
        ]
      }
    ];
    
    console.warn('Plano de emergência criado devido a erro:', errorMessage);
    return fallbackPlan;
  }

  // Additional helper methods...
  private calculateDailyCalories(user: UserProfile): number {
    if (!user.weight || !user.height || !user.age || !user.gender) {
      throw new Error('Dados do usuário incompletos.');
    }

    // Check if today is a variation day
    const today = new Date().getDay();
    const isVariationDay = VARIATION_DAYS.includes(today);
    const variationFactor = isVariationDay ? (Math.random() * 0.2) - 0.1 : 0;

    // Calculate BMR using Mifflin-St Jeor formula
    let bmr = user.gender === 'masculino'
      ? (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5
      : (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;

    // Activity factor
    let activityFactor = 1.2; // Sedentary
    switch (user.goals?.activityLevel) {
      case 'light': activityFactor = 1.375; break;
      case 'moderate': activityFactor = 1.55; break;
      case 'active': activityFactor = 1.725; break;
      case 'very_active': activityFactor = 1.9; break;
    }

    let tdee = bmr * activityFactor;

    // Verificar contexto de maternidade
    const isMaternity = user.gender === 'feminino' && user.lifeContext === 'maternity';
    
    if (isMaternity) {
      // Adiciona calorias extras para gestantes ou lactantes
      // Valores baseados em recomendações nutricionais padrão
      const maternityAddition = 300; // Adicional mínimo de 300 kcal 
      tdee += maternityAddition;
      
      // Se estiver em dieta de perda de peso, ajusta para garantir que seja seguro
      if (user.goals?.type === 'loss') {
        // Limita o déficit para garantir nutrição adequada durante gestação/lactação
        // Déficit máximo de 10% para maternidade
        const maxDeficit = 0.10;
        tdee *= (1 - maxDeficit);
      }
    } else {
      // Adjust for goal (for non-maternity cases)
    switch (user.goals?.type) {
      case 'loss':
        const bmi = user.weight / ((user.height / 100) ** 2);
        const deficit = bmi > 30 ? 0.20 : bmi > 25 ? 0.15 : 0.10;
        tdee *= (1 - deficit);
        break;
      case 'gain':
        tdee *= 1.10; // 10% surplus
        break;
      }
    }

    // Ensure minimum calories
    // Para maternidade aumentamos o mínimo seguro de calorias
    let minCalories = user.gender === 'masculino' ? 1500 : 1200;
    if (isMaternity) {
      minCalories = 1800; // Mínimo mais alto para mulheres em situação de maternidade
    }
    
    const baseCalories = Math.max(Math.round(tdee), minCalories);
    
    return Math.round(baseCalories * (1 + variationFactor));
  }

  private calculateTargetMacros(calories: number, goalType?: string): { proteinTarget: number; carbsTarget: number; fatTarget: number } {
    let proteinRatio = 0.3; // 30% protein
    let carbsRatio = 0.4;   // 40% carbs
    let fatRatio = 0.3;     // 30% fat

    switch (goalType) {
      case 'loss':
        proteinRatio = 0.35;
        carbsRatio = 0.35;
        fatRatio = 0.30;
        break;
      case 'gain':
        proteinRatio = 0.25;
        carbsRatio = 0.50;
        fatRatio = 0.25;
        break;
    }

    return {
      proteinTarget: Math.round((calories * proteinRatio) / 4),
      carbsTarget: Math.round((calories * carbsRatio) / 4),
      fatTarget: Math.round((calories * fatRatio) / 9)
    };
  }

  private generatePrompt(user: UserProfile, calories: number, macros: any): string {
    // Mapear preferência de orçamento para texto descritivo
    let budgetText = '';
    if (user.budgetPreference) {
      switch (user.budgetPreference) {
        case 'low':
          budgetText = 'Econômico (priorizar alimentos acessíveis e de baixo custo)';
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
    
    // Instruções específicas por tipo de dieta
    let dietSpecificInstructions = '';
    if (user.dietType === 'vegano') {
      dietSpecificInstructions = `
==================== ATENÇÃO ESPECIAL PARA DIETA VEGANA ====================
É ABSOLUTAMENTE CRÍTICO que NENHUM alimento de origem animal seja incluído no plano.

ESTRITAMENTE PROIBIDOS na dieta vegana:
- Carnes de qualquer tipo (frango, carne bovina, suína, peixe, etc)
- Leite e todos os derivados lácteos (queijos, iogurtes, requeijão, etc)
- Ovos e produtos que contêm ovos
- Mel e produtos derivados de abelhas

UTILIZE APENAS estas fontes de proteína veganas:
- Tofu, tempeh e seitan
- Leguminosas: feijões, lentilha, grão-de-bico, ervilha
- Quinoa, amaranto e outros grãos ricos em proteína
- Proteína de ervilha, arroz ou cânhamo (em pó)
- Leites e iogurtes vegetais (amêndoa, soja, aveia, coco)
- Queijos vegetais à base de castanhas ou tofu

VERIFIQUE duas vezes cada alimento antes de incluí-lo.
Quaisquer alimentos de origem animal comprometerão SERIAMENTE o plano.
=======================================================================
`;
    } else if (user.dietType === 'vegetariano') {
      dietSpecificInstructions = `
==================== ATENÇÃO ESPECIAL PARA DIETA VEGETARIANA ====================
É ABSOLUTAMENTE CRÍTICO que NENHUM tipo de carne seja incluído no plano.

ESTRITAMENTE PROIBIDOS na dieta vegetariana:
- Carnes de qualquer tipo (frango, carne bovina, suína)
- Peixes e frutos do mar (camarão, atum, bacalhau, etc)
- Bacon, presunto, salsicha e embutidos em geral
- Caldos e molhos à base de carne

PERMITIDOS na dieta vegetariana:
- Ovos e produtos derivados de ovos
- Leite e todos os derivados lácteos (queijos, iogurtes, requeijão)
- Mel e produtos apícolas

UTILIZE como fontes de proteína vegetariana:
- Ovos em diversas preparações
- Laticínios: queijos, iogurtes, leite
- Tofu, tempeh e seitan
- Leguminosas: feijões, lentilha, grão-de-bico, ervilha

VERIFIQUE duas vezes cada alimento antes de incluí-lo.
Quaisquer carnes ou peixes comprometerão SERIAMENTE o plano.
=======================================================================
`;
    } else if (user.dietType === 'low-carb') {
      dietSpecificInstructions = `
==================== ATENÇÃO ESPECIAL PARA DIETA LOW-CARB ====================
É CRÍTICO restringir carboidratos a no máximo ${Math.round(macros.carbsTarget)}g por dia.

LIMITADOS na dieta low-carb:
- Grãos (arroz, pão, aveia, massa) - apenas em pequenas quantidades
- Tubérculos (batata, mandioca, inhame) - apenas em pequenas quantidades
- Frutas - priorizar as de baixo índice glicêmico e em pequenas porções

PRIORIZE:
- Proteínas magras (frango, peixe, ovos, carnes magras)
- Gorduras saudáveis (azeite, abacate, oleaginosas)
- Vegetais de baixo carboidrato (folhas verdes, brócolis, couve-flor)

VERIFIQUE o teor de carboidratos de cada alimento e MANTENHA o total dentro da meta.
=======================================================================
`;
    } else if (user.dietType === 'cetogenica') {
      dietSpecificInstructions = `
==================== ATENÇÃO ESPECIAL PARA DIETA CETOGÊNICA ====================
É ABSOLUTAMENTE CRÍTICO manter os carboidratos EXTREMAMENTE BAIXOS (máximo 25-30g por dia).

DISTRIBUIÇÃO MACRO OBRIGATÓRIA:
- 70-75% das calorias devem vir de GORDURAS
- 20-25% das calorias devem vir de PROTEÍNAS
- 5-10% das calorias devem vir de CARBOIDRATOS (máximo 30g)

ALIMENTOS PROIBIDOS:
- Açúcares de qualquer tipo
- Grãos e cereais (arroz, aveia, trigo)
- Leguminosas (feijão, lentilha, grão-de-bico)
- Raízes e tubérculos (batata, mandioca)
- Frutas (exceto pequenas porções de frutas vermelhas)

ALIMENTOS PERMITIDOS:
- Carnes, aves e peixes
- Ovos
- Queijos e laticínios gordurosos (com moderação)
- Abacate, oleaginosas e sementes
- Óleos e gorduras saudáveis
- Vegetais de baixo carboidrato (folhosos verdes principalmente)

Cada refeição deve ser RICA EM GORDURAS e POBRE EM CARBOIDRATOS.
=======================================================================
`;
    }

    return `
Você é um nutricionista brasileiro gerando um plano alimentar personalizado.
RETORNE APENAS O JSON SOLICITADO, SEM TEXTO ADICIONAL E SEM FORMATAÇÃO MARKDOWN.
IMPORTANTE: TODAS AS REFEIÇÕES E ALIMENTOS DEVEM ESTAR EM PORTUGUÊS DO BRASIL.

${dietSpecificInstructions}

PERFIL:
- Peso: ${user.weight}kg
- Altura: ${user.height}cm
- Idade: ${user.age}
- Gênero: ${user.gender}
- Tipo de Dieta: ${user.dietType}
- Objetivo: ${user.goals?.type}
- Preferência de orçamento: ${budgetText || 'Não especificado'}
- Maternidade: ${maternityText}
- Alergias: ${user.allergies?.join(', ') || 'Nenhuma'}

METAS NUTRICIONAIS:
- Calorias: ${calories}
- Proteína: ${macros.proteinTarget}g
- Carboidratos: ${macros.carbsTarget}g
- Gorduras: ${macros.fatTarget}g
- Fibras: ${Math.round(calories / 1000 * 14)}g (14g/1000kcal)

${user.allergies?.length ? 'RESTRIÇÕES:' : ''}
${user.allergies?.map(a => `- Evitar: ${a}`).join('\n') || 'Nenhuma restrição'}

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
- OBRIGATÓRIO: proteína (${user.dietType === 'vegano' ? 'tofu, pasta de grão-de-bico, proteína vegetal, leite vegetal enriquecido' : user.dietType === 'vegetariano' ? 'ovo, iogurte, queijo, whey' : 'ovo, iogurte, whey, queijo'}) - MÍNIMO ${Math.round(macros.proteinTarget * 0.20)}g
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
- Use APENAS alimentos comuns e acessíveis no Brasil
- NUNCA use nomes de alimentos em inglês, SEMPRE em português do Brasil
- NUNCA repita o mesmo alimento principal em refeições diferentes
- DISTRIBUA proteínas ao longo do dia
- INCLUA fibras em todas as refeições (mínimo 3g por refeição)
- PRIORIZE gorduras boas (azeite, abacate, castanhas)
- INCLUA vegetais coloridos para variedade nutricional
- Priorize SEMPRE alimentos naturais e frescos
- Controle o sódio diário (máx 2000mg) e use temperos naturais
- VARIE fontes de proteína (animal/vegetal conforme dieta)
- VARIE cores dos vegetais (verde escuro, laranja, vermelho)
- USE medidas caseiras precisas (colher, xícara, unidade)
${user.budgetPreference === 'high' ? `- INCLUA alimentos premium de alta qualidade nutricional
- CONSIDERE superalimentos e ingredientes funcionais` : ''}

FORMATO JSON:
{ 
  "meals": [
    {
      "name": "Nome da Refeição",
      "time": "HH:MM",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "foods": [
        {
          "name": "Nome do Alimento",
          "portion": "Porção",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number
        }
      ]
    }
  ]
}`;
  }

  private validateDietCompatibility(plan: any, dietType: string): void {
    if (!plan || !plan.meals) {
      throw new Error('Plano de refeições inválido');
    }

    // Lista de alimentos incompatíveis com cada tipo de dieta
    const dietIncompatibilities: Record<string, string[]> = {
      'vegetariano': [
        'carne', 'frango', 'peixe', 'atum', 'sardinha', 'bacon', 'presunto',
        'salsicha', 'linguiça', 'bovina', 'suína', 'chester', 'peru',
        'salame', 'mortadela', 'chicken', 'beef', 'pork', 'fish', 'seafood'
      ],
      'vegano': [
        'carne', 'frango', 'peixe', 'atum', 'sardinha', 'bacon', 'presunto',
        'salsicha', 'linguiça', 'bovina', 'suína', 'chester', 'peru',
        'salame', 'mortadela', 'chicken', 'beef', 'pork', 'fish', 'seafood',
        'leite', 'queijo', 'iogurte', 'requeijão', 'cream cheese', 'whey protein',
        'ovo', 'ovos', 'mel', 'manteiga', 'milk', 'cheese', 'yogurt', 'egg', 'honey', 'butter'
      ]
    };

    // Se não for vegetariano ou vegano, não precisa validar
    if (dietType.toLowerCase() !== 'vegetariano' && dietType.toLowerCase() !== 'vegano') {
      return;
    }

    const incompatibleFoods = dietIncompatibilities[dietType.toLowerCase()] || [];
    
    // Criar um registro de substituições para palavras encontradas
    const localReplacements: Record<string, string> = {};
    
    // Loop por cada refeição para verificar incompatibilidades
    plan.meals.forEach((meal: any) => {
      // Para cada alimento na refeição
      meal.foods.forEach((food: any) => {
        if (!food.name) return;
        
        const foodName = food.name.toLowerCase();
        
        // Verificar se o nome do alimento contém algum dos itens incompatíveis
        const foundIncompatible = incompatibleFoods.find(item => 
          foodName.includes(item.toLowerCase())
        );
        
        if (foundIncompatible) {
          console.error(`Alimento incompatível com dieta ${dietType} encontrado: ${food.name}`);
          
          // Buscar substituição para este ingrediente
          const replacementIngredient = getDietCompatibleReplacement(foundIncompatible, dietType);
          
          // Armazenar a substituição para uso consistente
          localReplacements[foundIncompatible.toLowerCase()] = replacementIngredient;
          
          // Construir o novo nome com a substituição
          const newName = food.name.replace(
            new RegExp(foundIncompatible, 'i'), 
            replacementIngredient
          );
          
          console.log(`Substituindo "${food.name}" por "${newName}"`);
          
          // Atualizar o nome do alimento
          food.name = newName;
        }
      });
    });
    
    console.log('Validação de compatibilidade com dieta concluída');
  }
}

export const dietService = DietService.getInstance();