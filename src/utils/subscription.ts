import { UserProfile, NutritionistSession, CustomGoal } from '../types/user';

export function checkPremiumPlusLimits(user: UserProfile): {
  canGenerateNewPlan: boolean;
  canScheduleSession: boolean;
  canUpdateGoals: boolean;
  canAccessVideos: boolean;
  message?: string;
} {
  if (user.subscriptionTier !== 'premium-plus') {
    return {
      canGenerateNewPlan: false,
      canScheduleSession: false,
      canUpdateGoals: false,
      canAccessVideos: false,
      message: 'Recurso disponível apenas para assinantes Premium Plus'
    };
  }

  // Premium Plus não tem limites de uso
  return {
    canGenerateNewPlan: true,
    canScheduleSession: true,
    canUpdateGoals: true,
    canAccessVideos: true
  };
}

export function getEmergencyNutritionistSlots(): Date[] {
  // Retorna slots 24/7 para Premium Plus
  const slots: Date[] = [];
  const now = new Date();
  
  // Gerar slots para as próximas 24 horas
  for (let hour = 0; hour < 24; hour++) {
    const slot = new Date(now);
    slot.setHours(hour, 0, 0, 0);
    
    if (slot > now) {
      slots.push(slot);
      // Adicionar slot de 30 em 30 minutos
      const halfHourSlot = new Date(slot);
      halfHourSlot.setMinutes(30);
      slots.push(halfHourSlot);
    }
  }
  
  return slots;
}

export async function scheduleEmergencySession(
  user: UserProfile
): Promise<NutritionistSession> {
  if (user.subscriptionTier !== 'premium-plus') {
    throw new Error('Atendimento de emergência disponível apenas para Premium Plus');
  }

  // Criar sessão de emergência imediata
  const session: NutritionistSession = {
    id: Math.random().toString(36).substr(2, 9),
    userId: user.uid,
    scheduledFor: new Date(),
    status: 'scheduled',
    nutritionistId: 'nutricionista-emergencia',
    isEmergency: true,
    platform: 'video'
  };

  return session;
}

export async function createCustomGoal(
  user: UserProfile,
  goalData: Omit<CustomGoal, 'id' | 'userId' | 'createdAt'>
): Promise<CustomGoal> {
  if (user.subscriptionTier !== 'premium-plus') {
    throw new Error('Metas personalizadas disponíveis apenas para Premium Plus');
  }

  const goal: CustomGoal = {
    ...goalData,
    id: Math.random().toString(36).substr(2, 9),
    userId: user.uid,
    createdAt: new Date()
  };

  return goal;
}

export function getPrioritySupportEmail(user: UserProfile): string {
  if (user.subscriptionTier !== 'premium-plus') {
    return 'suporte@kiifit.com';
  }
  return 'suporte.prioritario@kiifit.com';
}