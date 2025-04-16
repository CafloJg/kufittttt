import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoading, useModal, useErrorHandling, useDiet } from '../hooks';
import { useError } from '../context/ErrorContext';
import { useUser } from '../context/UserContext'; 
import { useDietContext } from '../context/DietContext'; 
import { Calculator, ShoppingCart, RefreshCw, Activity, Calendar } from 'lucide-react';
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
import type { ShoppingList as ShoppingListType, Meal, DietPlan } from '../types/user';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function Diet() {
  const navigate = useNavigate();
  const { setError: setContextError, clearError, isNetworkError } = useError();
  const { isLoading, withLoading } = useLoading(true);
  const { withErrorHandling, error: handlingError, setError: setHandlingError } = useErrorHandling();
  const { user } = useUser();
  const userId = user?.uid;
  const { currentPlan: _userPlan, updateCurrentPlan: _updateCurrentPlan } = useDiet(userId);
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
    getMealRating
  } = useDietContext();
  const calendar = useModal();
  const calculator = useModal();
  const shoppingList = useModal();
  const [localError, setLocalError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const [lastUpdate, setLastUpdate] = useState<string | null>(null); 
  const [completedMealsCount, setCompletedMealsCount] = useState(0); 
  const [updateKey, setUpdateKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastCaloriesRef = useRef<number>(0);

  // Handle check-in with proper error handling
  const handleCheckIn = async () => {
    try {
      setIsRefreshing(true);
      await withErrorHandling(
        async () => {
          // Refresh user data to update UI
          if (user?.refreshUserData) {
            await user.refreshUserData();
          }
          
          // Update calories reference and force re-render
          const newCalories = user?.dailyStats?.caloriesConsumed || 0;
          lastCaloriesRef.current = newCalories;
          setLastUpdate(new Date().toISOString());
          setUpdateKey(Date.now());
          
          // Force refresh the diet plan to ensure UI is updated
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

  // Ensure the diet plan is loaded
  useEffect(() => {
    if (_userPlan && !currentPlan && isInitialLoad) {
      console.log('Loading diet plan from user data');
      refreshPlan().then(() => {
        setIsInitialLoad(false);
      });
    }
  }, [currentPlan, refreshPlan, isInitialLoad]);
  
  // Set up polling to keep diet data fresh
  useEffect(() => {
    // Initial refresh
    const initialRefresh = async () => {
      if (isInitialLoad) {
        try {
          console.log('Iniciando refresh inicial do plano...');
          await refreshPlan().catch(err => {
            console.error('Erro durante o refresh inicial:', err);
            setLocalError(err instanceof Error ? err : new Error('Erro desconhecido durante o refresh inicial'));
          });
          
          // Atualizar outros estados após o refresh bem-sucedido
          if (currentPlan) {
            console.log('Plano carregado com sucesso:', currentPlan.id);
            setLastUpdate(currentPlan.dailyStats?.lastUpdated || new Date().toISOString());
            // Contar refeições completadas do plano atual
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
    
    // Set up polling interval
    const interval = setInterval(async () => {
      if (isInitialLoad) return; // Skip polling during initial load
      
      try {
        await refreshPlan();
        // Verificar se houve atualizações no plano atual
        if (currentPlan && currentPlan.dailyStats) {
          const newLastUpdate = currentPlan.dailyStats.lastUpdated || new Date().toISOString();
          const todayMeals = currentPlan.dailyStats.completedMeals?.[today] || [];
          
          const hasChanged = newLastUpdate !== lastUpdate || 
                           todayMeals.length !== completedMealsCount;
          
          if (hasChanged) {
            setLastUpdate(newLastUpdate);
            setCompletedMealsCount(todayMeals.length);
            setUpdateKey(Date.now());
          }
        }
      } catch (error) {
        console.error('Error during refresh poll:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval); 
  }, [refreshPlan, isInitialLoad, lastUpdate, completedMealsCount, today, currentPlan]);

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

  // Reset error boundary handler
  const handleErrorReset = () => {
    console.log('Tentando resetar erros...');
    clearError();
    setLocalError(null);
    setHandlingError(null);
    // Reiniciar o estado da página
    setIsInitialLoad(true);
    // Forçar refresh dos dados
    refreshPlan().catch(err => {
      console.error('Erro durante refresh após reset de erro:', err);
    });
  };

  // Função para atualizar a lista de compras
  const updateShoppingList = async (list: ShoppingListType) => {
    if (!user) return;
    
    await withErrorHandling(
      async () => {
        clearError();
        setLocalError(null);
        
        // Atualizar a lista de compras diretamente no Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          shoppingList: list,
          updatedAt: new Date().toISOString()
        });
        
        // Atualizar os dados do usuário para refletir as mudanças
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" centered text="Carregando plano alimentar" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Área principal rolável com altura explícita e padding de segurança */}
      <div 
        className="overflow-y-scroll" 
        style={{ 
          height: 'calc(100vh - 70px)', // Aumentando a dedução para 70px para mais segurança
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' // Padding fixo maior + safe area
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-800">Plano Alimentar</h1>
              <p className="text-gray-600 flex items-center gap-2">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
                {isGenerating && (
                  <span className="text-primary-500 text-sm animate-pulse">
                    Gerando plano...
                  </span>
                )}
              </p>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-3 ml-2">
              {/* Calendar Button */}
              <button
                onClick={calendar.open}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Calendar size={24} className="text-gray-600" />
              </button>
             
              <button
                onClick={calculator.open}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Calculator size={24} className="text-gray-600" />
              </button>
              <button
                onClick={shoppingList.open}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart size={24} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Error display */}
          {(localError || handlingError || (genError && !isGenerating)) && (
            <button
              onClick={handleErrorReset}
              className="w-full bg-red-50 text-red-500 p-4 rounded-xl mb-6 hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>
                  {localError?.message || handlingError?.message || genError || 'Ocorreu um erro. Tente novamente.'}
                </span>
                <RefreshCw size={16} className="ml-2" />
              </div>
            </button>
          )}

          {/* Network Error Fallback */}
          {isNetworkError && (
            <ErrorFallback
              error={localError || new Error('Erro de conexão. Verifique sua internet e tente novamente.')}
              resetErrorBoundary={handleErrorReset}
              isNetworkError={true}
              context="Erro de Conexão"
            />
          )}

          {/* Progress */}
          {currentPlan && !isGenerating && (
            <DietProgress
              key={`diet-progress-${updateKey}`}
              plans={user?.dietHistory?.plans || []}
              currentPlan={currentPlan}
              completedMeals={currentPlan.dailyStats?.completedMeals?.[today]}
              onUpdate={refreshPlan}
            />
          )}

          {/* Meals */}
          <div className="space-y-6 mt-8">
            {isGenerating ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4">
                  <div className="w-full h-full border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-700 font-medium">Gerando seu plano alimentar...</p>
                <p className="text-gray-500 text-sm mt-2">{generationMessage || 'Isso pode levar até 1 minuto...'}</p>
                
                {/* Cancel button */}
                <button
                  onClick={cancelGeneration}
                  className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (currentPlan ? (
              <ErrorBoundary
                onReset={handleErrorReset}
                name="DietMeals" 
                onError={(error) => {
                  console.error('Error caught by ErrorBoundary:', error);
                  setLocalError(error);
                }}
                fallback={(errorInfo: { error: Error | null }) => (
                  <ErrorFallback
                    error={localError || errorInfo.error || new Error("Ocorreu um erro na página de dieta")}
                    resetErrorBoundary={handleErrorReset}
                    context="Erro ao carregar refeições"
                    severity="error"
                    shouldReport={true}
                  />
                )}
              > 
                {currentPlan.meals && currentPlan.meals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {currentPlan.meals.map((meal) => (
                      <ErrorBoundary 
                        key={`meal-${meal.id}`} 
                        name="MealCard"
                        onError={(error) => {
                          console.error('Error in meal card:', error);
                          setLocalError(error);
                        }}
                        fallback={
                          <ErrorFallback
                            error={new Error('Erro ao exibir refeição')}
                            resetErrorBoundary={handleErrorReset}
                            context="Erro ao exibir refeição"
                          />
                        }
                      >
                        <MealCard
                          meal={meal}
                          isCompleted={
                            currentPlan.dailyStats?.completedMeals?.[today]?.includes(meal.id) || false
                          }
                          onCheckIn={(mealId) => {
                            return withErrorHandling(
                              async () => {
                                await markMealCompleted(mealId);
                              }, 
                              { context: 'Concluir refeição', severity: 'warning' }
                            );
                          }}
                          isLoading={isRefreshing}
                          onLike={(mealId) => {
                            return withErrorHandling(
                              async () => {
                                await likeMeal(mealId);
                              }, 
                              { context: 'Curtir refeição', severity: 'info' }
                            );
                          }}
                          onDislike={(mealId) => {
                            return withErrorHandling(
                              async () => {
                                await dislikeMeal(mealId);
                              }, 
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
                      onClick={generatePlan}
                      className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
                    >
                      Gerar Novo Plano
                    </button>
                  </div>
                )}
              </ErrorBoundary>
            ) : (
              <DietGenerator 
                onGenerate={generatePlan}
                isGenerating={isGenerating}
                generationMessage={generationMessage}
                error={genError}
                canCancel={isGenerating}
                onCancel={cancelGeneration}
              />
            ))}
          </div>
          
          {/* Elemento espaçador para garantir que o conteúdo não seja cortado */}
          <div className="h-32"></div>
        </div>
      </div>

      {/* Calendar Modal */}
      {calendar.isOpen && currentPlan && (
        <Modal title="Calendário" onClose={calendar.close}>
          <DietCalendar
            plans={user?.dietHistory?.plans || []}
            futurePlans={currentPlan.nextPlans || {}}
            onSelectPlan={() => {}}
            onClose={calendar.close}
          />
        </Modal>
      )}

      {/* Calculator Modal */}
      {calculator.isOpen && (
        <Modal title="Calculadora de Macros" onClose={calculator.close}>
          <MacroCalculator onClose={calculator.close} />
        </Modal>
      )}

      {/* Shopping List Modal */}
      {shoppingList.isOpen && user?.shoppingList && (
        <Modal title="Lista de Compras Semanal" onClose={shoppingList.close}>
          <ShoppingList
            list={user.shoppingList}
            onClose={shoppingList.close}
            onUpdate={updateShoppingList}
          />
        </Modal>
      )}

      {/* BottomNav fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <BottomNav />
      </div>
    </div>
  );
}

export default Diet;