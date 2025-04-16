import { UserProfile } from '../types/user';
import { getPlanByTier, checkPlanLimits } from '../lib/plans';
import { canAccessFeature } from '../lib/firebase/subscriptions';

export function checkBasicPlanLimits(user: UserProfile): {
  canGenerateNewPlan: boolean;
  canUpdateGoals: boolean;
  canAccessFeature: (feature: string) => Promise<boolean>;
  message?: string;
} {
  const plan = getPlanByTier(user.subscriptionTier);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Verificar limite de planos mensais
  const monthlyPlanCount = user.monthlyPlanCount || 0;
  const canGenerateNewPlan = checkPlanLimits(
    user.subscriptionTier,
    'monthlyDietPlans',
    monthlyPlanCount
  );

  // Verificar limite de metas personalizadas
  const customGoalsCount = user.customGoals?.length || 0;
  const canUpdateGoals = checkPlanLimits(
    user.subscriptionTier,
    'customGoals',
    customGoalsCount
  );

  // Verificar acesso a recursos específicos
  const canAccessFeature = async (feature: string): Promise<boolean> => {
    return await canAccessFeature(user.uid, feature);
  };

  if (!canGenerateNewPlan && !canUpdateGoals) {
    return {
      canGenerateNewPlan: false,
      canUpdateGoals: false,
      canAccessFeature,
      message: `Você atingiu o limite do plano ${plan.name}. Faça upgrade para mais recursos!`
    };
  }

  return {
    canGenerateNewPlan,
    canUpdateGoals,
    canAccessFeature,
    message: canGenerateNewPlan ? undefined : 'Limite de planos mensais atingido'
  };
}

export function checkPremiumPlanLimits(user: UserProfile): {
  canScheduleSession: boolean;
  canAccessNutritionist: boolean;
  availableSessions: number;
  message?: string;
} {
  const plan = getPlanByTier(user.subscriptionTier);
  
  // Verificar limite de sessões com nutricionista
  const weeklySessionCount = user.weeklySessionCount || 0;
  const canScheduleSession = checkPlanLimits(
    user.subscriptionTier,
    'nutritionistSessions',
    weeklySessionCount
  );

  // Verificar acesso ao nutricionista
  const canAccessNutritionist = plan.tier !== 'basic';
  
  // Calcular sessões disponíveis
  const availableSessions = plan.limits.nutritionistSessions === -1 ? 
    Infinity : 
    Math.max(0, plan.limits.nutritionistSessions - weeklySessionCount);
  if (!canScheduleSession) {
    return {
      canScheduleSession: false,
      canAccessNutritionist,
      availableSessions,
      message: `Você atingiu o limite de consultas do plano ${plan.name}`
    };
  }

  return {
    canScheduleSession: true,
    canAccessNutritionist: canAccessNutritionist,
    availableSessions: availableSessions
  };
}

export function getSupportPriority(user: UserProfile): string {
  const plan = getPlanByTier(user.subscriptionTier);
  return plan.limits.supportPriority;
}

export function getAvailableFeatures(user: UserProfile): string[] {
  const plan = getPlanByTier(user.subscriptionTier);
  return plan.features
    .filter(feature => feature.included)
    .map(feature => feature.name);
}