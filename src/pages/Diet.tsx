import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoading, useModal, useErrorHandling, useDiet, useGoals } from '../hooks';
import { useError } from '../context/ErrorContext';
import { useUser } from '../context/UserContext'; 
import { useDietContext } from '../context/DietContext'; 
import { Calculator, ShoppingCart, RefreshCw, Activity, Calendar, Target, Utensils, Camera } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { Modal } from '../components/common/Modal';
import { ErrorFallback } from '../components/common/ErrorFallback';
import ErrorBoundary from '../components/ErrorBoundary';
import DietGenerator from '../components/DietGenerator';
import MealCard from '../components/meal/MealCard';
import DietProgress from '../components/DietProgress';
import DietCalendar from '../components/DietCalendar';
import MacroCalculator from '../components/MacroCalculator';
import ShoppingList from '../components/ShoppingList';
import type { ShoppingList as ShoppingListType, Meal, DietPlan, UserProfile, CustomGoal } from '../types/user';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import CameraModal from '../components/CameraModal';

function Diet() {
  const navigate = useNavigate();
  const { setError: setContextError, clearError, isNetworkError } = useError();
  const { isLoading, withLoading } = useLoading(true);
  const { withErrorHandling, error: handlingError, setError: setHandlingError } = useErrorHandling();
  const { user } = useUser();
  const userId = user?.uid;
  const { currentPlan: _userPlan, updateCurrentPlan: _updateCurrentPlan } = useDiet(userId);
  const { goals, isLoading: goalsLoading } = useGoals();
  const {
    currentPlan,
    isGenerating, 
    error: genError,
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
  } = useDietContext();
  const calendar = useModal();
  const calculator = useModal();
  const shoppingList = useModal();
  const cameraModal = useModal();
  const [localError, setLocalError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const [lastUpdate, setLastUpdate] = useState<string | null>(null); 
  const [completedMealsCount, setCompletedMealsCount] = useState(0); 
  const [updateKey, setUpdateKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastCaloriesRef = useRef<number>(0);

  const pageIsLoading = isLoading || goalsLoading;

  const handleCheckIn = async () => {
    try {
      setIsRefreshing(true);
      await withErrorHandling(
        async () => {
          if (user?.refreshUserData) {
            await user.refreshUserData();
          }
          const newCalories = user?.dailyStats?.caloriesConsumed || 0;
          lastCaloriesRef.current = newCalories;
          setLastUpdate(new Date().toISOString());
          setUpdateKey(Date.now());
          await refreshPlan();
        }, 
        { context: 'Check-in diário', severity: 'warning' }
      );
    } catch (error) {
      console.error('Error during check-in:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (_userPlan && !currentPlan && isInitialLoad) {
      console.log('Loading diet plan from user data');
      refreshPlan().then(() => {
        setIsInitialLoad(false);
      });
    }
  }, [currentPlan, refreshPlan, isInitialLoad]);
  
  useEffect(() => {
    const initialRefresh = async () => {
      if (isInitialLoad) {
        try {
          console.log('Iniciando refresh inicial do plano...');
          await refreshPlan().catch(err => {
            console.error('Erro durante o refresh inicial:', err);
            setLocalError(err instanceof Error ? err : new Error('Erro desconhecido durante o refresh inicial'));
          });
          if (currentPlan) {
            console.log('Plano carregado com sucesso:', currentPlan.id);
            setLastUpdate(currentPlan.dailyStats?.lastUpdated || new Date().toISOString());
            const todayMeals = currentPlan.dailyStats?.completedMeals?.[today] || [];
            setCompletedMealsCount(todayMeals.length);
          } else {
            console.warn('Refresh concluído mas nenhum plano foi carregado');
            setLastUpdate(new Date().toISOString());
          }
        } catch (error) {
          console.error('Erro fatal durante inicialização da página de dieta:', error);
          setLocalError(error instanceof Error ? error : new Error('Erro desconhecido durante inicialização'));
        } finally {
          setIsInitialLoad(false);
        }
      }
    };
    initialRefresh();
    const interval = setInterval(async () => {
      if (isInitialLoad || !userId) return;
      try {
        await refreshPlan();
        if (currentPlan && currentPlan.dailyStats) {
          const newLastUpdate = currentPlan.dailyStats.lastUpdated || new Date().toISOString();
          const todayMeals = currentPlan.dailyStats.completedMeals?.[today] || [];
          const hasChanged = newLastUpdate !== lastUpdate || todayMeals.length !== completedMealsCount;
          if (hasChanged) {
            setLastUpdate(newLastUpdate);
            setCompletedMealsCount(todayMeals.length);
            setUpdateKey(Date.now());
          }
        }
      } catch (error) {
        console.error('Error during refresh poll:', error);
      }
    }, 30000);
    return () => clearInterval(interval); 
  }, [refreshPlan, isInitialLoad, lastUpdate, completedMealsCount, today, currentPlan, userId]);

  useEffect(() => {
    withErrorHandling(
      async () => {
        await withLoading(async () => {
          if (!user) {
            navigate('/login');
            return;
          }
        });
      },
      {
        context: 'Carregando página de dieta',
        severity: 'error'
      }
    );
  }, [navigate, user, withErrorHandling, withLoading]);

  const handleErrorReset = () => {
    console.log('Tentando resetar erros...');
    clearError();
    setLocalError(null);
    setHandlingError(null);
    setIsInitialLoad(true);
    refreshPlan().catch(err => {
      console.error('Erro durante refresh após reset de erro:', err);
    });
  };

  const updateShoppingList = async (list: ShoppingListType) => {
    if (!user) return;
    await withErrorHandling(
      async () => {
        clearError();
        setLocalError(null);
        const userRef = doc(db, 'users', user.uid);

        // Prepare data and clean undefined values
        const updateData = {
          shoppingList: list,
          updatedAt: new Date().toISOString()
        };
        const cleanedUpdateData = JSON.parse(JSON.stringify(updateData));

        await updateDoc(userRef, cleanedUpdateData);
        
        if (user.refreshUserData) {
          await user.refreshUserData();
        }
      },
      {
        context: 'Atualização de lista de compras',
        severity: 'warning',
        retries: 2
      }
    );
  };

  // Função para verificar se o usuário tem metas relevantes definidas
  const checkRelevantGoals = () => {
    // Sempre retorna true para permitir a geração do plano alimentar
    // independentemente das metas definidas
    console.log("Verificação de metas relevantes: retornando true");
    return true;
  };

  const hasRelevantGoals = checkRelevantGoals();
  
  // Adicionar log para depuração
  console.log("--- Verificação de Metas Relevantes ---");
  console.log("Metas atuais (goals):", goals);
  console.log("Resultado de hasRelevantGoals:", hasRelevantGoals);
  console.log("-------------------------------------");

  // Transição animada entre loading e conteúdo
  return (
    <AnimatePresence mode="wait">
      {pageIsLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen bg-gray-50 flex items-center justify-center"
        >
          <LoadingIndicator size="lg" centered text="Carregando plano alimentar" />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-full bg-gray-50"
        >
          <header className="sticky top-0 bg-white/90 backdrop-blur-sm drop-shadow-sm z-10 px-4 py-3 flex items-center justify-between safe-area-top">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800">Plano Alimentar</h1>
              <p className="text-xs text-gray-500">
                 {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long'
                 })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={calendar.open} className="p-2 hover:bg-gray-100 rounded-lg"><Calendar size={20} className="text-gray-600" /></button>
              <button onClick={calculator.open} className="p-2 hover:bg-gray-100 rounded-lg"><Calculator size={20} className="text-gray-600" /></button>
              <button onClick={shoppingList.open} className="p-2 hover:bg-gray-100 rounded-lg"><ShoppingCart size={20} className="text-gray-600" /></button>
              <button onClick={cameraModal.open} className="p-2 hover:bg-gray-100 rounded-lg"><Camera size={20} className="text-gray-600" /></button>
            </div>
          </header>

          <main 
            className="flex-1 overflow-y-auto pb-[max(4rem,env(safe-area-inset-bottom))]"
            style={{ WebkitOverflowScrolling: 'touch' }} 
          >
            <div className="max-w-lg mx-auto px-4 py-6">
              {(localError && !isGenerating) && (
                 <button
                  onClick={handleErrorReset}
                  className="w-full bg-red-50 text-red-500 p-4 rounded-xl mb-6 hover:bg-red-100 transition-colors"
                 >
                   <div className="flex items-center justify-between">
                    <span>
                      {localError.message || 'Ocorreu um erro. Tente novamente.'}
                    </span>
                    <RefreshCw size={16} className="ml-2" />
                  </div>
                 </button>
              )}
              {isNetworkError && (
                 <ErrorFallback
                  error={localError || new Error('Erro de conexão. Verifique sua internet e tente novamente.')}
                  resetErrorBoundary={handleErrorReset}
                  isNetworkError={true}
                  context="Erro de Conexão"
                 />
              )}

              {currentPlan && !isGenerating && (
                <DietProgress
                  key={`diet-progress-${updateKey}`}
                  plans={(user?.dietHistory?.plans as DietPlan[] | undefined) || []}
                  currentPlan={currentPlan}
                  completedMeals={currentPlan.dailyStats?.completedMeals?.[today]}
                  onUpdate={refreshPlan}
                />
              )}

              <div className="space-y-6 mt-6">
                {isGenerating ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-lg p-6">
                      <div className="w-16 h-16 mx-auto mb-4">
                        <div className="w-full h-full border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-gray-700 font-medium">Gerando seu plano alimentar...</p>
                      <p className="text-gray-500 text-sm mt-2">{generationMessage || 'Isso pode levar até 1 minuto...'}</p>
                      <button
                        onClick={cancelGeneration}
                        className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                ) : currentPlan ? (
                    <ErrorBoundary 
                      onReset={handleErrorReset} 
                      fallback={
                        <ErrorFallback 
                          error={localError}
                          resetErrorBoundary={handleErrorReset} 
                        />
                      }
                    > 
                      {currentPlan.meals && currentPlan.meals.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {currentPlan.meals.map((meal) => (
                            <ErrorBoundary key={`meal-${meal.id}`} fallback={<p>Erro ao carregar refeição</p>}>
                              <MealCard
                                meal={meal}
                                isCompleted={
                                  currentPlan.dailyStats?.completedMeals?.[today]?.includes(meal.id) || false
                                }
                                onCheckIn={(mealId) => {
                                  return withErrorHandling(
                                    async () => { await markMealCompleted(mealId); }, 
                                    { context: 'Concluir refeição', severity: 'warning' }
                                  );
                                }}
                                isLoading={isRefreshing}
                                onLike={(mealId) => {
                                  return withErrorHandling(
                                    async () => { await likeMeal(mealId); }, 
                                    { context: 'Curtir refeição', severity: 'info' }
                                  );
                                }}
                                onDislike={(mealId) => {
                                  return withErrorHandling(
                                    async () => { await dislikeMeal(mealId); }, 
                                    { context: 'Descurtir refeição', severity: 'info' }
                                  );
                                }}
                                getMealRating={getMealRating}
                              />
                            </ErrorBoundary>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-white rounded-xl shadow-sm">
                          <p className="text-gray-500">Nenhuma refeição encontrada no plano atual.</p>
                          <button 
                            onClick={() => withErrorHandling(generatePlan)} 
                            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
                          >
                            Gerar Novo Plano
                          </button>
                        </div>
                      )}
                    </ErrorBoundary>
                ) : hasRelevantGoals ? (
                  <div className="mx-4 my-6 bg-white rounded-2xl shadow-lg flex flex-col items-center p-6">
                    <div className="bg-gradient-to-br from-pink-100 to-pink-50 rounded-full p-4 mb-4">
                      <Utensils size={32} className="text-pink-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Plano Alimentar Personalizado</h2>
                    <p className="text-sm text-gray-500 mb-6 text-center">Gere seu plano personalizado com base em suas metas.</p>
                    <button 
                      onClick={() => withErrorHandling(generatePlan)}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold py-3 rounded-lg shadow-md transform active:scale-95 transition disabled:opacity-70"
                    >
                      {isGenerating ? 'Gerando...' : 'GERAR PLANO ALIMENTAR'}
                    </button>
                    {genError && <p className="text-red-500 text-sm mt-3">{genError.message}</p>}
                  </div>
                ) : (
                  <div className="mx-4 my-6 bg-white rounded-2xl shadow-lg flex flex-col items-center p-6 text-center">
                     <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-full p-4 mb-4">
                        <Target size={32} className="text-blue-500" />
                     </div>
                     <h2 className="text-xl font-bold text-gray-800 mb-1">Defina suas Metas Primeiro</h2>
                     <p className="text-sm text-gray-500 mb-6">Precisamos das suas metas de peso, nutrição ou hidratação para gerar um plano alimentar personalizado.</p>
                     <button 
                        onClick={() => navigate('/goals')} 
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold py-3 rounded-lg shadow-md transform active:scale-95 transition"
                     >
                        DEFINIR METAS
                     </button>
                  </div>
                )}
              </div>
            </div>
          </main>

          {calendar.isOpen && currentPlan && (
            <Modal title="Calendário" onClose={calendar.close}>
              <DietCalendar
                plans={(user?.dietHistory?.plans as DietPlan[] | undefined) || []}
                futurePlans={(currentPlan.nextPlans as Record<string, DietPlan>) || {}}
                onSelectPlan={() => {}}
                onClose={calendar.close}
              />
            </Modal>
          )}
          {calculator.isOpen && (
            <Modal title="Calculadora de Macros" onClose={calculator.close}>
              <MacroCalculator onClose={calculator.close} />
            </Modal>
          )}
          {shoppingList.isOpen && (
            <Modal title="Lista de Compras Semanal" onClose={shoppingList.close}>
              <ShoppingList
                list={user?.shoppingList ?? {
                  id: `temp-${userId || 'nouser'}`, 
                  userId: userId!, 
                  name:'Lista Temporária', 
                  items:[], 
                  createdAt: new Date().toISOString(), 
                  updatedAt: new Date().toISOString(), 
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                } as ShoppingListType} 
                onClose={shoppingList.close}
                onUpdate={updateShoppingList}
              />
            </Modal>
          )}
          {cameraModal.isOpen && (
            <CameraModal 
              isOpen={cameraModal.isOpen} 
              onClose={cameraModal.close} 
              onAddMeal={(meal) => {
                withErrorHandling(async () => {
                  await addCustomMeal({
                    name: meal.name,
                    nutrition: {
                      kcal: meal.nutrition.kcal,
                      protein: meal.nutrition.protein,
                      carbs: meal.nutrition.carbs,
                      fat: meal.nutrition.fat
                    }
                  });
                  
                  // Fechar o modal após adicionar a refeição
                  cameraModal.close();
                  
                  // Exibir mensagem de sucesso - opcional, se você tiver algum componente de toast
                  // toast.success('Refeição adicionada com sucesso!');
                }, { context: 'Adicionar refeição', severity: 'warning' });
              }}
            />
          )}

          <BottomNav />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Diet;