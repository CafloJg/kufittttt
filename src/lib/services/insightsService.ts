import { z } from 'zod';
import type { UserProfile } from '../../types/user';

// Validation schemas
const insightSchema = z.object({
  type: z.enum(['achievement', 'trend', 'suggestion', 'warning']),
  title: z.string(),
  description: z.string(),
  metric: z.string().optional(),
  value: z.number().optional(),
  change: z.number().optional(),
  timeframe: z.string().optional(),
  priority: z.number().min(1).max(5),
  actionable: z.boolean(),
  action: z.string().optional()
});

export type Insight = z.infer<typeof insightSchema>;

export class InsightsService {
  private static instance: InsightsService;

  private constructor() {}

  static getInstance(): InsightsService {
    if (!this.instance) {
      this.instance = new InsightsService();
    }
    return this.instance;
  }

  async generateDailyInsights(user: UserProfile): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Analyze progress towards goals
      if (user.goals?.targetWeight) {
        const weightProgress = user.weightProgress || [];
        if (weightProgress.length >= 2) {
          const latestWeight = weightProgress[weightProgress.length - 1].weight;
          const previousWeight = weightProgress[weightProgress.length - 2].weight;
          const change = latestWeight - previousWeight;
          
          if (Math.abs(change) >= 0.5) {
            insights.push({
              type: 'trend',
              title: change > 0 ? 'Ganho de Peso' : 'Perda de Peso',
              description: `Você ${change > 0 ? 'ganhou' : 'perdeu'} ${Math.abs(change).toFixed(1)}kg desde sua última medição.`,
              metric: 'weight',
              value: latestWeight,
              change,
              timeframe: '7 dias',
              priority: 4,
              actionable: true,
              action: change > 0 ? 'Revisar plano alimentar' : 'Manter o bom trabalho'
            });
          }
        }
      }

      // Analyze diet adherence
      const dietStats = user.dailyStats;
      if (dietStats) {
        const targetCalories = user.currentDietPlan?.totalCalories || 2000;
        const consumedCalories = dietStats.caloriesConsumed;
        const adherenceRate = (consumedCalories / targetCalories) * 100;
        
        if (adherenceRate < 80 || adherenceRate > 120) {
          insights.push({
            type: 'warning',
            title: 'Consumo Calórico Fora da Meta',
            description: `Seu consumo está ${adherenceRate < 80 ? 'abaixo' : 'acima'} do recomendado.`,
            metric: 'calories',
            value: consumedCalories,
            priority: 5,
            actionable: true,
            action: 'Ajustar porções das refeições'
          });
        }
      }

      // Check protein intake
      if (dietStats?.proteinConsumed) {
        const targetProtein = user.currentDietPlan?.proteinTarget || 0;
        const proteinRate = (dietStats.proteinConsumed / targetProtein) * 100;
        
        if (proteinRate < 90) {
          insights.push({
            type: 'suggestion',
            title: 'Consumo de Proteína Baixo',
            description: 'Aumentar o consumo de proteína pode ajudar na recuperação muscular.',
            metric: 'protein',
            value: dietStats.proteinConsumed,
            priority: 3,
            actionable: true,
            action: 'Adicionar fontes de proteína magra'
          });
        }
      }

      // Check water intake
      if (dietStats?.waterIntake) {
        const targetWater = 2500; // ml
        if (dietStats.waterIntake < targetWater * 0.7) {
          insights.push({
            type: 'warning',
            title: 'Hidratação Baixa',
            description: 'Sua ingestão de água está abaixo do recomendado.',
            metric: 'water',
            value: dietStats.waterIntake,
            priority: 4,
            actionable: true,
            action: 'Aumentar consumo de água'
          });
        }
      }

      // Check achievements
      if (user.checkInStreak) {
        if (user.checkInStreak % 7 === 0) {
          insights.push({
            type: 'achievement',
            title: 'Sequência Semanal!',
            description: `Parabéns! Você completou ${user.checkInStreak} dias seguidos de check-in.`,
            metric: 'streak',
            value: user.checkInStreak,
            priority: 2,
            actionable: false
          });
        }
      }

      return insights.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate insights');
    }
  }

  async generateWeeklyReport(user: UserProfile): Promise<any> {
    try {
      // Implementation for weekly report
      // This would analyze trends, progress, and generate recommendations
      return {};
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw new Error('Failed to generate weekly report');
    }
  }
}