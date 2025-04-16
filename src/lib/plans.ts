import type { SubscriptionTier } from '../types/user';

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'annual';
  discount?: number;
  features: PlanFeature[];
  limits: {
    monthlyDietPlans: number;
    nutritionistSessions: number;
    customGoals: number;
    supportPriority: 'normal' | 'high' | 'priority';
    videoLessons: number;
    mealPlans: number;
    customRecipes: number;
    aiAssistant: boolean;
  };
}

export const plans: Plan[] = [
  {
    tier: 'basic',
    name: 'Básico',
    description: 'Controle de metas e objetivos básicos para sua saúde',
    price: 39.90,
    billingPeriod: 'monthly',
    features: [
      {
        name: 'Controle de metas e objetivos básicos',
        description: 'Acompanhamento de peso e medidas',
        included: true
      },
      {
        name: '3 cardápios saudáveis por mês',
        description: 'Cardápios personalizados mensais',
        included: true
      },
      {
        name: 'Suporte por email',
        description: 'Suporte básico por email',
        included: true
      },
      {
        name: 'Análise de alimentos por foto',
        description: 'Reconhecimento automático de alimentos',
        included: false
      },
      {
        name: 'Consultas com nutricionista',
        description: 'Atendimento com nutricionista',
        included: false
      },
      {
        name: 'Receitas personalizadas',
        description: 'Receitas baseadas nos seus objetivos',
        included: false
      },
      {
        name: 'Vídeo aulas',
        description: 'Treinos em casa',
        included: false
      }
    ],
    limits: {
      monthlyDietPlans: 3,
      nutritionistSessions: 0,
      customGoals: 3,
      supportPriority: 'normal',
      videoLessons: 0,
      mealPlans: 3,
      customRecipes: 0,
      aiAssistant: false
    }
  },
  {
    tier: 'premium',
    name: 'Premium',
    description: 'Todas as funções do plano basic com atendimento nutricional flexível',
    price: 59.90,
    billingPeriod: 'monthly',
    discount: 20,
    features: [
      {
        name: 'Todas as funções do plano Basic',
        description: 'Acesso a todos os recursos básicos',
        included: true
      },
      {
        name: '5 dietas flexíveis por semana',
        description: 'Cardápios adaptáveis semanalmente',
        included: true
      },
      {
        name: 'Nutricionista 3x por semana',
        description: 'Atendimento em qualquer horário',
        included: true
      },
      {
        name: 'Suporte estendido',
        description: 'Atendimento em horário estendido',
        included: true
      },
      {
        name: 'Análise de alimentos por foto',
        description: 'Reconhecimento automático de alimentos',
        included: false
      },
      {
        name: 'Receitas personalizadas',
        description: 'Receitas baseadas nos seus objetivos',
        included: false
      },
      {
        name: 'Vídeo aulas',
        description: 'Treinos em casa',
        included: false
      }
    ],
    limits: {
      monthlyDietPlans: 20,
      nutritionistSessions: 3,
      customGoals: 10,
      supportPriority: 'high',
      videoLessons: 10,
      mealPlans: 10,
      customRecipes: 5,
      aiAssistant: false
    }
  },
  {
    tier: 'premium-plus',
    name: 'Premium Plus',
    description: 'Todas as funções dos planos anteriores com atendimento 24/7',
    price: 84.90,
    billingPeriod: 'monthly',
    discount: 30,
    features: [
      {
        name: 'Todas as funções dos planos anteriores',
        description: 'Acesso completo a todos os recursos',
        included: true
      },
      {
        name: 'Nutricionista 24/7',
        description: 'Atendimento disponível a qualquer momento',
        included: true
      },
      {
        name: 'Suporte prioritário',
        description: 'Atendimento VIP com prioridade máxima',
        included: true
      },
      {
        name: 'Personalização avançada',
        description: 'Personalização completa de metas e objetivos',
        included: true
      },
      {
        name: 'Análise de alimentos por foto',
        description: 'Análise detalhada com IA avançada',
        included: true
      },
      {
        name: 'Receitas personalizadas',
        description: 'Receitas exclusivas e personalizadas ilimitadas',
        included: true
      },
      {
        name: 'Vídeo aulas',
        description: 'Acesso ilimitado a vídeo aulas de treino',
        included: true
      }
    ],
    limits: {
      monthlyDietPlans: -1, // ilimitado
      nutritionistSessions: -1, // ilimitado
      customGoals: -1, // ilimitado
      supportPriority: 'priority',
      videoLessons: -1,
      mealPlans: -1,
      customRecipes: -1,
      aiAssistant: true
    }
  }
];

export function getPlanByTier(tier: SubscriptionTier): Plan {
  const plan = plans.find(p => p.tier === tier);
  if (!plan) {
    throw new Error(`Plano não encontrado: ${tier}`);
  }
  return plan;
}

export function checkPlanLimits(
  tier: SubscriptionTier,
  type: keyof Plan['limits'],
  currentUsage: number
): boolean {
  const plan = getPlanByTier(tier);
  const limit = plan.limits[type];
  return limit === -1 || currentUsage < limit;
}

export function getPlanFeatures(tier: SubscriptionTier): PlanFeature[] {
  const plan = getPlanByTier(tier);
  return plan.features;
}

export function getPlanLimits(tier: SubscriptionTier): Plan['limits'] {
  const plan = getPlanByTier(tier);
  return plan.limits;
}

export function formatPlanLimit(limit: number): string {
  return limit === -1 ? 'Ilimitado' : limit.toString();
}