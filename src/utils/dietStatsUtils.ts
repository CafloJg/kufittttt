/**
 * Utilitários para gerenciar estatísticas de dieta
 */
import type { DailyStats, Meal } from '../types/user';

/**
 * Atualiza as estatísticas diárias com os valores de uma refeição
 * @param currentStats Estatísticas atuais
 * @param options Opções de atualização
 * @returns Estatísticas atualizadas
 */
export function updateDailyStats(
  currentStats: DailyStats, 
  options: {
    addCalories?: number;
    addProtein?: number;
    addCarbs?: number;
    addFat?: number;
    completedMealId?: string;
    date?: string;
  }
): DailyStats {
  const {
    addCalories = 0,
    addProtein = 0,
    addCarbs = 0,
    addFat = 0,
    completedMealId,
    date = new Date().toISOString().split('T')[0]
  } = options;
  
  // Clone profundo para evitar referências
  const statsClone: DailyStats = JSON.parse(JSON.stringify(currentStats));
  
  // Garantir que temos a estrutura correta
  if (!statsClone.completedMeals) {
    statsClone.completedMeals = {};
  }
  
  if (!statsClone.completedMeals[date]) {
    statsClone.completedMeals[date] = [];
  }
  
  // Atualizar valores
  statsClone.caloriesConsumed = (statsClone.caloriesConsumed || 0) + addCalories;
  statsClone.proteinConsumed = (statsClone.proteinConsumed || 0) + addProtein;
  statsClone.carbsConsumed = (statsClone.carbsConsumed || 0) + addCarbs;
  statsClone.fatConsumed = (statsClone.fatConsumed || 0) + addFat;
  
  // Adicionar refeição se fornecida
  if (completedMealId && !statsClone.completedMeals[date].includes(completedMealId)) {
    statsClone.completedMeals[date].push(completedMealId);
  }
  
  statsClone.lastUpdated = new Date().toISOString();
  
  return statsClone;
}

/**
 * Adiciona uma refeição às estatísticas diárias
 * @param currentStats Estatísticas atuais
 * @param meal Refeição a ser adicionada
 * @param date Data (opcional, padrão: hoje)
 * @returns Estatísticas atualizadas
 */
export function addMealToDailyStats(
  currentStats: DailyStats,
  meal: Meal,
  date?: string
): DailyStats {
  return updateDailyStats(currentStats, {
    addCalories: meal.calories,
    addProtein: meal.protein,
    addCarbs: meal.carbs,
    addFat: meal.fat,
    completedMealId: meal.id,
    date
  });
}

/**
 * Reinicia as estatísticas diárias
 * @returns Estatísticas zeradas
 */
export function createEmptyDailyStats(): DailyStats {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    caloriesConsumed: 0,
    proteinConsumed: 0,
    carbsConsumed: 0,
    fatConsumed: 0,
    waterIntake: 0,
    completedMeals: {
      [today]: []
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calcula o progresso da dieta
 * @param currentStats Estatísticas atuais
 * @param targetCalories Calorias alvo
 * @param targetProtein Proteína alvo
 * @returns Objeto com porcentagens de progresso
 */
export function calculateDietProgress(
  currentStats: DailyStats,
  targetCalories: number,
  targetProtein: number
): {
  caloriesProgress: number;
  proteinProgress: number;
  overallProgress: number;
} {
  const caloriesProgress = Math.min(
    100,
    Math.round((currentStats.caloriesConsumed / targetCalories) * 100)
  );
  
  const proteinProgress = Math.min(
    100,
    Math.round((currentStats.proteinConsumed / targetProtein) * 100)
  );
  
  // Progresso geral é a média dos dois
  const overallProgress = Math.round((caloriesProgress + proteinProgress) / 2);
  
  return {
    caloriesProgress,
    proteinProgress,
    overallProgress
  };
} 