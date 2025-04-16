import { getChatResponse } from './openai';
import { generateMeals } from '../utils/dietGenerator';
import { calculateMacros } from './diet';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Message } from '../types/chat';
import type { UserProfile } from '../types/user'; 

// Helper to get personalized greeting based on time
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '🌅 Bom dia';
  if (hour < 18) return '☀️ Boa tarde';
  return '🌙 Boa noite';
}

// Helper to get motivational phrases based on progress
function getMotivationalPhrase(user: UserProfile): string {
  const phrases = [
    '💪 Você está indo muito bem!',
    '🎯 Continue focado em seus objetivos!',
    '⭐ Cada progresso conta!',
    '🌟 Sua dedicação está fazendo a diferença!',
    '🚀 Você está mais próximo de suas metas!'
  ];

  // Add context-specific phrases
  if (user.checkInStreak && user.checkInStreak > 3) {
    phrases.push(`🔥 Incrível! ${user.checkInStreak} dias seguidos de check-in!`);
  }
  
  if (user.goals?.type === 'loss' && user.weightProgress?.length > 0) {
    const initialWeight = user.weightProgress[0].weight;
    const currentWeight = user.weight;
    if (currentWeight < initialWeight) {
      phrases.push('📉 Sua jornada de emagrecimento está dando resultados!');
    }
  }

  return phrases[Math.floor(Math.random() * phrases.length)];
}

const assistantFunctions = {
  async generateNewDietPlan(user: UserProfile): Promise<string> {
    if (!user.uid || !user.dietType || !user.weight) {
      throw new Error('Complete seu perfil antes de gerar um novo plano alimentar.');
    }

    try {
      const newPlan = await generateMeals(user);
      
      // Add motivational touch to response
      const motivation = getMotivationalPhrase(user);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentDietPlan: newPlan,
        lastPlanGenerated: new Date()
      });

      return `${motivation}\n\nSeu novo plano alimentar está pronto! 🎉\nVamos começar? Confira suas refeições na aba Dieta.`;
    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Não foi possível gerar um novo plano alimentar no momento.'
      );
    }
  },

  async calculateFoodMacros(foods: string[]): Promise<string> {
    if (!foods.length) {
      throw new Error('Liste os alimentos que deseja calcular. Exemplo: "calcular macros: arroz, feijão, frango"');
    }
    
    const greeting = getGreeting();

    try {
      const macros = await calculateMacros(foods);
      return `
${greeting}! Aqui está a análise dos seus alimentos:

🔸 Calorias: ${macros.calories} kcal
🔸 Proteínas: ${macros.protein}g
🔸 Carboidratos: ${macros.carbs}g
🔸 Gorduras: ${macros.fat}g
🔸 Fibras: ${macros.fiber}g

💡 Dica: Para resultados mais precisos, considere pesar os alimentos.

Que tal incluir isso no seu plano de hoje? 😊`;
    } catch (error) {
      console.error('Erro ao calcular macros:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Não foi possível calcular os macronutrientes no momento.'
      );
    }
  }
};

// Helper to format error messages
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('API key')) {
      return 'Serviço temporariamente indisponível. Por favor, tente novamente mais tarde.';
    }
    if (error.message.includes('rate limit')) {
      return 'Muitas solicitações. Por favor, aguarde alguns minutos.';
    }
    if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    if (error.message.includes('timeout')) {
      return 'O serviço está demorando para responder. Tente novamente em alguns minutos.';
    }
    return error.message;
  }
  return 'Erro ao processar sua mensagem. Por favor, tente novamente.';
}

export async function processChat( 
  messages: Message[],
  userProfile: UserProfile
): Promise<string> {
  if (!messages.length || !userProfile) {
    throw new Error('Por favor, digite uma mensagem.');
  }

  try {
    const lastMessage = messages[messages.length - 1].text;
    
    if (!lastMessage.trim()) {
      throw new Error('Por favor, digite uma mensagem.');
    }

    // Check for API key
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error('Chave da API OpenAI não encontrada. Verifique o arquivo .env');
    }

    // Specific commands
    if (lastMessage.toLowerCase().includes('novo plano') || 
        lastMessage.toLowerCase().includes('mudar dieta')) {
      try {
        const response = await assistantFunctions.generateNewDietPlan(userProfile);
        return response;
      } catch (error) {
        throw new Error(formatErrorMessage(error));
      }
    }
    
    // Detect macro calculation requests
    const macrosRegex = /calcular\s+(?:macros|nutrientes|calorias)(?:\s+(?:de|do|da|dos|das|para))?\s*[:;]?\s*(.+)/i;
    const macrosMatch = lastMessage.match(macrosRegex);
    
    if (macrosMatch) {
      const foodText = macrosMatch[1].trim();
      if (!foodText) {
        throw new Error('Por favor, liste os alimentos que deseja calcular. Exemplo: "calcular macros: arroz, feijão, frango"');
      }

      const foods = foodText
        .split(/[,\n]/)
        .map(food => food.trim())
        .filter(food => food.length > 0);
        
      if (foods.length === 0) {
        throw new Error('Por favor, liste os alimentos que deseja calcular. Exemplo: "calcular macros: arroz, feijão, frango"');
      }

      try {
        const response = await assistantFunctions.calculateFoodMacros(foods);
        return response;
      } catch (error) {
        throw new Error(formatErrorMessage(error));
      }
    }

    // Normal message processing
    try {
      const response = await getChatResponse(messages, userProfile);
      
      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        throw new Error('Não foi possível processar sua mensagem. Por favor, tente novamente.');
      }

      return response;
    } catch (apiError) {
      console.error('Erro na API:', apiError);
      throw new Error(formatErrorMessage(apiError));
    }
  } catch (error) {
    console.error('Erro ao processar chat:', error);
    throw new Error(formatErrorMessage(error));
  }
}