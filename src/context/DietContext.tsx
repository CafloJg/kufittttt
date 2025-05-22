import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { DietRepository } from '../lib/repositories/dietRepository';
import { NetworkStatus } from '../utils/network';
import { useUser } from './UserContext';
import { dietService } from '../lib/services/dietService';
import { useQueryClient } from '@tanstack/react-query';
import type { DietPlan, Meal } from '../types/user';
import { updateDailyStats, addMealToDailyStats } from '../utils/dietStatsUtils';

// Dias da semana para variação do plano (1=Segunda, 3=Quarta, 5=Sexta)
const VARIATION_DAYS = [1, 3, 5];

export interface DietContextType {
  currentPlan: DietPlan | null;
  isGenerating: boolean;
  error: string | null;
  generationMessage: string | null;
  setGenerationMessage: (message: string | null) => void;
  generatePlan: () => Promise<void>;
  cancelGeneration: () => void;
  markMealCompleted: (mealId: string) => Promise<void>;
  refreshPlan: () => Promise<DietPlan | null>;
  likeMeal: (mealId: string) => Promise<void>;
  dislikeMeal: (mealId: string) => Promise<void>;
  getMealRating: (mealId: string) => { liked: boolean; disliked: boolean };
  addCustomMeal: (mealData: { name: string, nutrition: { kcal: number, protein: number, carbs: number, fat: number }}) => Promise<void>;
}

const DietContext = createContext<DietContextType | undefined>(undefined);

export function DietProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState<DietPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const queryClient = useQueryClient();
  const dietRepo = DietRepository.getInstance();

  // Dados para rastreamento de likes/dislikes de refeições
  const [mealRatings, setMealRatings] = useState<{[mealId: string]: 'like' | 'dislike'}>({});

  // Load current plan when user changes
  useEffect(() => {
    if (!user) return;
    
    const loadCurrentPlan = async () => {
      try {
        const plan = await dietRepo.getCurrentPlan(user.uid);
        setCurrentPlan(plan);
      } catch (err) {
        console.error('Error loading current plan:', err);
        setError('Erro ao carregar plano alimentar');
      }
    };
    
    loadCurrentPlan();
  }, [user]);

  // Carregar ratings ao carregar o plano
  useEffect(() => {
    if (!currentPlan || !user) return;
    
    const loadMealRatings = async () => {
      try {
        // Tentar carregar as avaliações do banco de dados
        const userRef = doc(db, 'users', user.uid);
        
        // Usar getDoc diretamente ao invés do método que não existe
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists() && docSnap.data().mealRatings) {
          setMealRatings(docSnap.data().mealRatings);
          console.log('Avaliações de refeições carregadas:', docSnap.data().mealRatings);
        }
      } catch (err) {
        console.error('Erro ao carregar avaliações de refeições:', err);
      }
    };
    
    loadMealRatings();
  }, [currentPlan, user]);

  const refreshPlan = async (): Promise<DietPlan | null> => {
    try {
      if (!user) {
        console.error('Tentativa de refresh sem usuário');
        setError('Usuário não encontrado. Faça login novamente.');
        return null;
      }

      if (isGenerating) {
        console.log('Ignorando refresh durante geração de plano');
        return null;
      }

      console.log('Iniciando refresh do plano...');

      // Verificar se o usuário tem plano atual
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('Documento do usuário não encontrado');
        setError('Dados do usuário não encontrados.');
        return null;
      }
      
      const userData = userDoc.data();
      const currentUserPlan = userData?.currentDietPlan as DietPlan | undefined;
      
      if (!currentUserPlan) {
        console.warn('Usuário não tem plano atual');
        setCurrentPlan(null);
        return null;
      }
      
      // Verificar se o plano tem todos os campos obrigatórios
      if (!currentUserPlan.id || !currentUserPlan.meals || !Array.isArray(currentUserPlan.meals)) {
        console.error('Plano inválido encontrado:', JSON.stringify(currentUserPlan, null, 2));
        setError('Plano alimentar inválido. Tente gerar um novo plano.');
      return null;
      }

      // Recuperar avaliações das refeições
      const userRatings = userData?.mealRatings || {};
      setMealRatings(userRatings);

      console.log(`Plano carregado: ${currentUserPlan.id} com ${currentUserPlan.meals.length} refeições`);
      setCurrentPlan(currentUserPlan);
      return currentUserPlan;
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar plano alimentar');
      throw error;
    }
  };

  const generatePlan = async () => {
    if (!user) {
      setError('Faça login para gerar um plano alimentar.');
      throw new Error('Usuário não autenticado');
    }

    console.log('Iniciando geração de plano. Verificando perfil do usuário...');
    console.log('Dados do usuário:', {
      weight: user.weight,
      height: user.height,
      age: user.age,
      gender: user.gender,
      dietType: user.dietType,
      goals: user.goals
    });
    
    // Verificar se o perfil do usuário está completo
    if (!user.weight || !user.height || !user.age || !user.gender) {
      const errorMsg = 'Complete seu perfil antes de gerar um plano alimentar.';
      console.error(`Erro: ${errorMsg} Faltando: ${!user.weight ? 'peso, ' : ''}${!user.height ? 'altura, ' : ''}${!user.age ? 'idade, ' : ''}${!user.gender ? 'gênero' : ''}`);
      setError(errorMsg);
      return;
    }

    if (!user.goals?.type) {
      const errorMsg = 'Configure suas metas antes de gerar um plano alimentar.';
      console.error(`Erro: ${errorMsg}`);
      setError(errorMsg);
      return;
    }

    if (!user.dietType) {
      const errorMsg = 'Selecione um tipo de dieta no seu perfil.';
      console.error(`Erro: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    // Exibir mensagem específica para dietas vegetarianas e veganas
    if (user.dietType === 'vegano' || user.dietType === 'vegetariano') {
      setGenerationMessage(`Iniciando geração do plano alimentar ${user.dietType}. Garantindo que não haja alimentos incompatíveis com sua dieta...`);
    } else {
      setGenerationMessage('Iniciando geração do plano alimentar...');
    }

    console.log('Perfil do usuário validado com sucesso. Iniciando geração...');

    setIsGenerating(true);
    setError(null);

    // Reset current plan and progress
    setCurrentPlan(null);
    
    // Reiniciar estatísticas diárias no documento do usuário
    try {
      if (user.uid) {
        const userRef = doc(db, 'users', user.uid);
        const today = new Date().toISOString().split('T')[0];
        
        // Atualizar document do usuário
        await updateDoc(userRef, {
          'dailyStats.caloriesConsumed': 0,
          'dailyStats.proteinConsumed': 0,
          'dailyStats.carbsConsumed': 0,
          'dailyStats.fatConsumed': 0,
          'dailyStats.waterIntake': 0,
          'dailyStats.completedMeals': { [today]: [] },
          'dailyStats.lastUpdated': new Date().toISOString()
        });
        
        // Também reiniciar diretamente o objeto do usuário em memória
        if (user.dailyStats) {
          const updatedDailyStats = {
            ...user.dailyStats,
            caloriesConsumed: 0,
            proteinConsumed: 0,
            carbsConsumed: 0,
            fatConsumed: 0,
            waterIntake: 0,
            completedMeals: { [today]: [] }
          };
          
          // Atribuir de volta ao usuário
          user.dailyStats = updatedDailyStats;
          
          // Atualizar manualmente a propriedade lastUpdated em outro objeto para evitar erro de tipagem
          try {
            // userRef já foi definido acima, então vamos reutilizá-lo
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists() && userDoc.data().dailyStats) {
              // Atualizar a propriedade lastUpdated diretamente no Firestore
              await updateDoc(userRef, {
                'dailyStats.lastUpdated': new Date().toISOString()
              });
            }
          } catch (err) {
            console.warn('Erro ao atualizar lastUpdated:', err);
          }
        }
        
        console.log('Estatísticas diárias reiniciadas para o novo plano alimentar');
        
        // Invalidar queries para forçar atualização dos dados no frontend
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['diet'] });
        
        // Atualizar estado local se o usuário tiver método de refresh
        if (user.refreshUserData && typeof user.refreshUserData === 'function') {
          try {
            await user.refreshUserData();
          } catch (refreshError) {
            console.warn('Erro ao atualizar dados do usuário após reiniciar estatísticas:', refreshError);
          }
        }
      }
    } catch (resetError) {
      console.error('Erro ao reiniciar estatísticas diárias:', resetError);
      // Continuar com a geração do plano mesmo se o reset falhar
    }
    
    try {
      const service = dietService;
      
      // Obter refeições favoritas para incluir no novo plano
      let favoriteMeals = [];
      try {
        // Obter o documento do usuário para acessar as refeições favoritas
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        if (userData && userData.favoriteMeals) {
          console.log('Obtendo refeições favoritas para incluir no plano...');
          
          // Converter o objeto de refeições favoritas em array
          favoriteMeals = Object.values(userData.favoriteMeals);
          
          // Filtrar por refeições curtidas
          const likedMealIds = Object.entries(mealRatings)
            .filter(([_, rating]) => rating === 'like')
            .map(([id]) => id);
            
          console.log(`Encontradas ${favoriteMeals.length} refeições favoritas e ${likedMealIds.length} curtidas`);
          
          // Adicionar as refeições favoritas como parâmetro na geração de plano
          service.setFavoriteMeals(favoriteMeals);
        }
      } catch (error) {
        console.warn('Erro ao obter refeições favoritas:', error);
        // Continuar mesmo se falhar ao obter favoritos
      }
      
      let newPlan: DietPlan;
      try {
        newPlan = await service.generateMealPlan(user);
      } catch (planGenerationError) {
        console.error('Erro durante geração do plano, usando plano de emergência:', planGenerationError);
        
        // Agora o método é público e podemos chamar diretamente
        newPlan = service.handleError(planGenerationError);
        
        // Registramos o erro, mas continuamos com o plano de emergência
        console.warn('Usando plano de emergência devido a erro na geração regular');
        setGenerationMessage('Ocorreu um erro, mas criamos um plano básico para você. Tente gerar novamente mais tarde.');
      }
      
      // Verificação adicional para garantir que o plano é compatível com a dieta
      if (user.dietType === 'vegano' || user.dietType === 'vegetariano') {
        setGenerationMessage(`Verificando se o plano está adequado para dieta ${user.dietType}...`);
        
        // Verificação extra das refeições para garantir compatibilidade
        const incompatibleFoods: string[] = [];
        
        if (newPlan && newPlan.meals) {
          // Lista de alimentos incompatíveis para verificação
          const nonVegetarianFoods = ['frango', 'carne', 'peixe', 'atum', 'salmão', 'bacon'];
          const nonVeganFoods = [...nonVegetarianFoods, 'leite', 'queijo', 'iogurte', 'ovo'];
          
          newPlan.meals.forEach(meal => {
            if (meal.foods) {
              meal.foods.forEach(food => {
                const foodName = food.name.toLowerCase();
                
                if (user.dietType === 'vegano') {
                  for (const nonVegan of nonVeganFoods) {
                    if (foodName.includes(nonVegan)) {
                      incompatibleFoods.push(`${food.name} (contém ${nonVegan})`);
                      break;
                    }
                  }
                } else if (user.dietType === 'vegetariano') {
                  for (const nonVeg of nonVegetarianFoods) {
                    if (foodName.includes(nonVeg)) {
                      incompatibleFoods.push(`${food.name} (contém ${nonVeg})`);
                      break;
                    }
                  }
                }
              });
            }
          });
        }
        
        // Se encontramos alimentos incompatíveis, mostrar aviso
        if (incompatibleFoods.length > 0) {
          console.error(`ATENÇÃO: Plano gerado contém alimentos incompatíveis com dieta ${user.dietType}: ${incompatibleFoods.join(', ')}`);
          setError(`O plano contém alimentos incompatíveis com sua dieta ${user.dietType}. Tente gerar novamente.`);
          setIsGenerating(false);
          return;
        }
        
        setGenerationMessage('Plano verificado e confirmado como adequado para sua dieta!');
      }
      
      console.log('Plano gerado com sucesso!', newPlan);
      setCurrentPlan(newPlan);
      
      // Reset errors
      setError(null);
      setGenerationMessage(null);
      
      // Log para debug
      console.log('Plano finalizado e definido no contexto.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao gerar plano:', error);
      setError(`Falha ao gerar plano: ${errorMessage}`);
      setGenerationMessage(null);
    } finally {
        setIsGenerating(false);
    }
  };

  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      setGenerationMessage(null);
      setError('Geração de plano cancelada pelo usuário');
    }
  };

  const markMealCompleted = async (mealId: string): Promise<void> => {
    if (!user || !currentPlan) {
      setError('Plano alimentar não encontrado. Gere um novo plano.');
      throw new Error('Plano alimentar não encontrado. Gere um novo plano.'); 
    }
    
    try {
      // Find the meal in the current plan
      const meal = currentPlan.meals.find(m => m.id === mealId);
      
      if (!meal) {
        throw new Error('Refeição não encontrada');
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Usar a nova função utilitária para atualizar as estatísticas
      const updatedStats = addMealToDailyStats(
        currentPlan.dailyStats || {
        caloriesConsumed: 0,
        proteinConsumed: 0, 
        carbsConsumed: 0, 
        fatConsumed: 0, 
        waterIntake: 0,
          completedMeals: {},
        lastUpdated: new Date().toISOString()
        },
        meal,
        today
      );

      // Update the plan with the new stats
      const updatedPlan = {
        ...currentPlan,
        dailyStats: updatedStats,
        lastUpdated: new Date().toISOString()
      };

      // Update in Firestore
      try {        
        // Clean undefined values before updating
        const cleanedPlan = JSON.parse(JSON.stringify(updatedPlan));

        // Use the repository to update both the plan and user data atomically
        const result = await dietRepo.updateCurrentPlanAndUserStats(user.uid, cleanedPlan);
        console.log('Plan and user stats updated in Firestore successfully');
        
        // Refresh user data to update dashboard
        if (user.refreshUserData) {
          try {
            const refreshedUser = await user.refreshUserData();
            console.log('User data refreshed with calories:', refreshedUser?.dailyStats?.caloriesConsumed);
          } catch (refreshError) {
            console.warn('Error refreshing user data after meal completion:', refreshError);
          }
        }
      } catch (updateError) {
        console.error('Error updating plan in Firestore:', updateError);
        // Attempt to update just the plan as a fallback
        try {
          // Ensure the plan is clean here too
          const fallbackCleanedPlan = JSON.parse(JSON.stringify(updatedPlan));
          await dietRepo.updateCurrentPlan(user.uid, fallbackCleanedPlan);
          console.log('Fallback: Updated plan only');
        } catch (fallbackError) {
          console.error('Fallback update also failed:', fallbackError);
          throw updateError;
        }
        throw updateError;
      }

      // Update local state with the new plan
      setCurrentPlan(updatedPlan);
      console.log('Local state updated with new plan:', updatedPlan.id, 'and calories:', updatedStats.caloriesConsumed);
    } catch (err) {
      console.error('Error marking meal as completed:', err);
      setError(err instanceof Error ? err.message : 'Erro ao marcar refeição como completada');
      throw err;
    }
  };

  // Função para dar like em uma refeição
  const likeMeal = async (mealId: string): Promise<void> => {
    if (!user || !currentPlan) {
      setError('Plano alimentar não encontrado. Gere um novo plano.');
      throw new Error('Plano alimentar não encontrado. Gere um novo plano.');
    }
    
    try {
      // Verifique se a refeição existe no plano
      const meal = currentPlan.meals.find(m => m.id === mealId);
      if (!meal) {
        throw new Error('Refeição não encontrada');
      }
      
      // Atualizar o estado local
      const newRatings = { ...mealRatings };
      
      // Se já tem like, remover. Se tem dislike, mudar para like
      if (newRatings[mealId] === 'like') {
        delete newRatings[mealId];
      } else {
        newRatings[mealId] = 'like';
      }
      
      setMealRatings(newRatings);
      
      // Preparar para adicionar/remover às refeições favoritas
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      let favoriteMeals = userData?.favoriteMeals || {};
      
      // Se estamos dando like, adicionar a refeição favorita
      if (newRatings[mealId] === 'like') {
        console.log('Adicionando refeição aos favoritos:', meal.name);
        
        // Criar um ID único para a refeição favorita
        const favoriteId = `fav-${meal.id}-${Date.now()}`;
        
        // Adicionar a refeição aos favoritos (garantir tipo correto)
        const favMeal: Partial<Meal> & { savedAt: string } = {
          id: favoriteId,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          // Garantir que foods não seja undefined e copiar todos os campos
          foods: meal.foods?.map(food => ({
            // Copiar todos os campos de food
            ...food 
          })) ?? [], 
          savedAt: new Date().toISOString()
        };

        favoriteMeals[favoriteId] = favMeal;

      } else {
        // Se estamos removendo o like, procurar e remover dos favoritos
        console.log('Removendo refeição dos favoritos:', meal.name);
        
        // Encontrar todas as entradas que correspondem a esta refeição
        // Ajustar filtro para verificar tipo e propriedade 'name'
        const matchingFavorites = Object.entries(favoriteMeals)
          .filter(([_, fav]) => {
            // Verificar se 'fav' é um objeto e tem a propriedade 'name'
            return typeof fav === 'object' && fav !== null && 'name' in fav && (fav as Partial<Meal>).name === meal.name;
          })
          .map(([id]) => id);
        
        // Remover as entradas correspondentes
        matchingFavorites.forEach(id => {
          delete favoriteMeals[id];
        });
      }
      
      // Preparar dados para atualização
      const updateData = {
        mealRatings: newRatings,
        favoriteMeals: favoriteMeals,
        updatedAt: new Date().toISOString()
      };

      // Limpar undefined antes de atualizar no Firestore
      const cleanedUpdateData = JSON.parse(JSON.stringify(updateData));

      await updateDoc(userRef, cleanedUpdateData);
      
      console.log(`Refeição ${mealId} avaliada como 'like' e atualizada nos favoritos`);
      
      // Invalidar queries para atualização
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Recuperar o plano atualizado, mas não retornar
      await refreshPlan();
      return;
    } catch (err) {
      console.error('Erro ao avaliar refeição:', err);
      setError(err instanceof Error ? err.message : 'Erro ao avaliar refeição');
      throw err;
    }
  };
  
  // Função para dar dislike em uma refeição
  const dislikeMeal = async (mealId: string): Promise<void> => {
    if (!user || !currentPlan) {
      setError('Plano alimentar não encontrado. Gere um novo plano.');
      throw new Error('Plano alimentar não encontrado. Gere um novo plano.');
    }
    
    try {
      // Verifique se a refeição existe no plano
      const meal = currentPlan.meals.find(m => m.id === mealId);
      if (!meal) {
        throw new Error('Refeição não encontrada');
      }
      
      // Atualizar o estado local
      const newRatings = { ...mealRatings };
      
      // Se já tem dislike, remover. Se tem like, mudar para dislike
      if (newRatings[mealId] === 'dislike') {
        delete newRatings[mealId];
      } else {
        newRatings[mealId] = 'dislike';
      }
      
      setMealRatings(newRatings);
      
      // Preparar dados para atualização
      const updateData = {
        mealRatings: newRatings,
        updatedAt: new Date().toISOString()
      };

      // Limpar undefined antes de atualizar no Firestore
      const cleanedUpdateData = JSON.parse(JSON.stringify(updateData));

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, cleanedUpdateData);
      
      console.log(`Refeição ${mealId} avaliada como 'dislike'`);
      
      // Invalidar queries para atualização
        queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Atualizar plano sem retornar o resultado
      await refreshPlan();
      return;
    } catch (err) {
      console.error('Erro ao avaliar refeição:', err);
      setError(err instanceof Error ? err.message : 'Erro ao avaliar refeição');
      throw err;
    }
  };
  
  // Função para obter a avaliação atual de uma refeição
  const getMealRating = (mealId: string) => {
    return {
      liked: mealRatings[mealId] === 'like',
      disliked: mealRatings[mealId] === 'dislike'
    };
  };

  // Função para adicionar uma refeição personalizada
  const addCustomMeal = async (mealData: { 
    name: string, 
    nutrition: { 
      kcal: number, 
      protein: number, 
      carbs: number, 
      fat: number 
    }
  }): Promise<void> => {
    if (!user || !currentPlan) {
      setError('Plano alimentar não encontrado. Gere um novo plano.');
      throw new Error('Plano alimentar não encontrado. Gere um novo plano.');
    }
    
    try {
      // Gerar ID único para a nova refeição
      const mealId = `custom-${Date.now()}`;
      
      // Criar objeto de refeição no formato esperado pelo sistema
      const newMeal: Meal = {
        id: mealId,
        name: mealData.name,
        calories: mealData.nutrition.kcal,
        protein: mealData.nutrition.protein,
        carbs: mealData.nutrition.carbs,
        fat: mealData.nutrition.fat,
        foods: [{
          name: mealData.name,
          portion: "1 porção",
          calories: mealData.nutrition.kcal,
          protein: mealData.nutrition.protein,
          carbs: mealData.nutrition.carbs,
          fat: mealData.nutrition.fat
        }],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      
      // Adicionar a refeição ao plano atual
      const updatedMeals = [...currentPlan.meals, newMeal];
      
      // Atualizar o plano com a nova refeição
      const updatedPlan = {
        ...currentPlan,
        meals: updatedMeals,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualizar no Firestore
      try {
        // Limpar valores undefined antes de atualizar
        const cleanedPlan = JSON.parse(JSON.stringify(updatedPlan));
        
        // Usar o repositório para atualizar o plano
        await dietRepo.updateCurrentPlan(user.uid, cleanedPlan);
        console.log('Refeição personalizada adicionada com sucesso:', newMeal.name);
        
        // Atualizar estado local
        setCurrentPlan(updatedPlan);
        
        // Opcional: marcar a refeição como concluída
        await markMealCompleted(mealId);
        
        // Atualizar cache
        queryClient.invalidateQueries({ queryKey: ['dietPlan'] });
        
        // Alerta de sucesso (pode ser implementado em outro lugar)
        console.log('Refeição personalizada adicionada e registrada no consumo diário');
      } catch (updateError) {
        console.error('Erro ao atualizar plano com refeição personalizada:', updateError);
        throw updateError;
      }
    } catch (err) {
      console.error('Erro ao adicionar refeição personalizada:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar refeição personalizada');
      throw err;
    }
  };

  return (
    <DietContext.Provider
      value={{
        currentPlan,
        isGenerating,
        error,
        generationMessage,
        setGenerationMessage,
        generatePlan,
        cancelGeneration,
        markMealCompleted,
        refreshPlan,
        likeMeal,
        dislikeMeal,
        getMealRating,
        addCustomMeal
      }}
    >
      {children}
    </DietContext.Provider>
  );
}

export function useDietContext() {
  const context = useContext(DietContext);
  if (context === undefined) {
    throw new Error('useDietContext must be used within a DietProvider');
  }
  return context;
}