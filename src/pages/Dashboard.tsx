import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, ChevronRight, Utensils, Target, Dumbbell, Sun, Moon, Coffee, Apple, Award, Droplet, Calendar } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import ErrorBoundary from '../components/ErrorBoundary';
import { ErrorFallback } from '../components/common/ErrorFallback';
import DailyCheckIn from '../components/DailyCheckIn';
import { useUser } from '../context/UserContext';
import { useDietContext } from '../context/DietContext';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import WaterTracker from '../components/WaterTracker';
import { useErrorHandling } from '../hooks';
import { resetDailyStats } from '../utils/dailyReset';

function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading, refreshUserData } = useUser();
  const { currentPlan } = useDietContext();
  const { withErrorHandling } = useErrorHandling();
  const [currentHour] = useState(new Date().getHours());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountRef = useRef(0); 
  const [updateKey, setUpdateKey] = useState<number>(Date.now());
  const lastCaloriesRef = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load user data once on initial render
  useEffect(() => {
    if (isInitialLoad && user && refreshUserData) {
      const loadData = async () => {
        try {
          setIsRefreshing(true);
          await refreshUserData();
          const newCalories = user?.dailyStats?.caloriesConsumed || 0;
          
          // Only update if calories have changed
          if (newCalories !== lastCaloriesRef.current) {
            lastCaloriesRef.current = newCalories;
            setLastUpdate(new Date());
            setUpdateKey(Date.now()); // Force re-render
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        } finally {
          setIsRefreshing(false);
          setIsInitialLoad(false);
        }
      };
      
      loadData();
    }
  }, [refreshUserData, isInitialLoad, user]);

  // Set up a more efficient refresh strategy with a maximum number of refreshes
  useEffect(() => {
    // Skip if still in initial loading state
    if (isInitialLoad || !refreshUserData) return;
    
    // Maximum number of automatic refreshes to prevent infinite loops
    const MAX_AUTO_REFRESHES = 5;
    
    const scheduleNextRefresh = () => {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Stop refreshing if we've reached the maximum number of refreshes
      if (refreshCountRef.current >= MAX_AUTO_REFRESHES) {
        console.log(`Reached maximum number of auto-refreshes (${MAX_AUTO_REFRESHES})`);
        return;
      }
      
      // Increase interval as refresh count increases (exponential backoff)
      const refreshCount = refreshCountRef.current;
      const interval = Math.min(5000 + (refreshCount * 1000), 30000); // Start at 5s, max 30s
      
      refreshTimeoutRef.current = setTimeout(async () => {
        if (document.visibilityState === 'visible' && navigator.onLine && !isRefreshing) {
          try {
            setIsRefreshing(true);
            await refreshUserData();
            const newCalories = user?.dailyStats?.caloriesConsumed || 0;
            
            // Only update if calories have changed
            if (newCalories !== lastCaloriesRef.current) {
              lastCaloriesRef.current = newCalories;
              setLastUpdate(new Date());
              setUpdateKey(Date.now()); // Force re-render
            }
            
            refreshCountRef.current += 1;
          } catch (error) {
            console.error('Error during scheduled refresh:', error);
          } finally {
            setIsRefreshing(false);
          }
        }
        
        // Schedule next refresh
        scheduleNextRefresh();
      }, interval);
    };
    
    // Start the refresh cycle
    scheduleNextRefresh();
    
    // Reset refresh count when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset refresh count to allow new refreshes
        refreshCountRef.current = 0;
        
        if (!isRefreshing && refreshUserData) {
          setIsRefreshing(true);
          refreshUserData().then(() => {
            const newCalories = user?.dailyStats?.caloriesConsumed || 0;
            if (newCalories !== lastCaloriesRef.current) {
              lastCaloriesRef.current = newCalories;
              setUpdateKey(Date.now()); // Force re-render
            }
          })
            .then(() => setUpdateKey(Date.now())) // Force re-render on success
            .catch(console.error)
            .finally(() => setIsRefreshing(false));
          }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshCountRef.current = 0;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUserData, isInitialLoad, isRefreshing, user]);
  
  // Handle check-in with proper error handling
  const handleCheckIn = async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      
      if (user?.uid) {
        try {
          await resetDailyStats(user.uid);
          console.log('Daily stats reset successfully during check-in');
        } catch (resetError) {
          console.error('Error resetting daily stats during check-in:', resetError);
        }
      }
      
      // Atualizar a interface
      if (refreshUserData) {
        await refreshUserData();
      }
      
      // Forçar atualização da interface
      lastCaloriesRef.current = 0;
      setLastUpdate(new Date());
      setUpdateKey(Date.now());
      
    } catch (error) {
      console.error('Error during check-in:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getGreeting = () => {
    if (currentHour < 12) return 'Bom dia';
    if (currentHour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (isLoading && isInitialLoad) {
    return (
      <LoadingIndicator size="lg" centered fullScreen text="Carregando dashboard" />
    );
  }

  return (
    <ErrorBoundary
      name="Dashboard"
      key={`dashboard-${updateKey}`}
      fallback={
        <ErrorFallback
          error={new Error("Erro ao carregar dashboard")}
          resetErrorBoundary={() => window.location.reload()}
          context="Erro ao carregar dashboard"
          showHomeButton={false}
          showBackButton={false}
        />
      }
    >
      {/* Container externo: Mantém min-h */}
      <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 relative flex flex-col min-h-[600px] md:min-h-screen">
        {/* Background decorativo: OK */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-visible">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500/5 blur-3xl animate-pulse-slow" />
          <div className="absolute top-60 -left-40 w-[32rem] h-[32rem] rounded-full bg-secondary-500/5 blur-3xl animate-pulse-slow delay-300" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl animate-pulse-slow delay-700" />
        </div>

        {/* Container interno: REMOVER flex-1, overflow-y-auto, overscroll-y-auto */}
        {/* Manter max-w-lg, mx-auto, padding */}
        <div className="max-w-lg mx-auto px-4 py-6 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-1">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Usuário'}!
              </h1>
              <p className="text-gray-600 flex items-center gap-2 animate-fade-in delay-200">
                <span>Vamos manter o foco hoje!</span>
                <span className="inline-block animate-bounce-subtle">💪</span>
              </p>
            </div>
            <button 
              onClick={() => navigate('/profile')}
              className="relative w-14 h-14 rounded-2xl glass-morphism overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 border border-white/20"
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-50 flex items-center justify-center text-primary-500 text-lg font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </button>
          </div>

          {/* Daily Check-in */}
          <ErrorBoundary
            name="DailyCheckIn"
            fallback={
              <div className="mobile-card p-6 bg-white rounded-3xl shadow-lg">
                <div className="text-center py-4">
                  <p className="text-red-500 mb-2">Erro ao carregar check-in diário</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            }
          >
            <DailyCheckIn userData={user!} onCheckIn={handleCheckIn} />
          </ErrorBoundary>

          {/* Water and Calories Stats */}
          <div className="grid grid-cols-1 gap-4 mb-6 animate-slide-up w-full">
            <div className="stat-card glass-morphism hover:shadow-xl transition-all p-4 overflow-hidden rounded-2xl border border-blue-200">
              <div className="flex flex-col h-full items-center justify-center">
                <WaterTracker />
              </div> 
            </div>

            <div 
              onClick={() => navigate('/diet')}
              className="stat-card glass-morphism hover:shadow-xl transition-all cursor-pointer p-4 overflow-hidden rounded-2xl border border-pink-200"
              key={`calories-${user?.dailyStats?.caloriesConsumed || 0}-${currentPlan?.totalCalories || 0}-${updateKey}`}>
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-3">
                  <Activity className="text-pink-500" size={20} />
                  <h3 className="text-lg font-bold">Calorias</h3>
                </div>
                <p className="text-xl font-bold text-pink-500 flex items-baseline">
                  {Math.round(user?.dailyStats?.caloriesConsumed || 0)} <span className="text-xs font-medium text-gray-500 ml-1">kcal</span>
                </p>
              </div>
              
              <div className="flex justify-center items-center">
                <div className="relative w-36 h-36">
                  {/* Circular progress background */}
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="#f0f0f0" 
                      strokeWidth="10"
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="url(#calories-gradient)" 
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - Math.min((user?.dailyStats?.caloriesConsumed || 0) / (currentPlan?.totalCalories || 2000), 1))}
                      transform="rotate(-90 50 50)"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="calories-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F840BA" />
                        <stop offset="100%" stopColor="#EE8B60" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">
                      {Math.min(Math.round((user?.dailyStats?.caloriesConsumed || 0) / (currentPlan?.totalCalories || 2000) * 100), 100)}%
                    </span>
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      Meta
                      {lastUpdate && (
                        <span className="text-[10px] text-gray-400 animate-pulse">•</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 text-center text-sm text-gray-600">
                <p className="font-medium">
                  {Math.round(user?.dailyStats?.caloriesConsumed || 0)} de {currentPlan?.totalCalories || 2000} kcal
                </p>
              </div>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="glass-morphism overflow-hidden mb-5 animate-slide-up delay-100">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-secondary-500/10 rounded-lg flex items-center justify-center float-effect">
                  <Calendar className="text-secondary-500" size={18} />
                </div>
                <h2 className="text-base font-semibold">Cronograma de Hoje</h2>
              </div>
            </div>
          
            <div className="divide-y divide-white/5">
              {[
                { 
                  icon: Coffee, 
                  time: '07:00', 
                  title: 'Café da Manhã',
                  calories: currentPlan?.meals?.[0]?.calories || 0,
                  status: currentHour >= 7 ? 'done' : 'pending'
                },
                { 
                  icon: Apple, 
                  time: '10:00', 
                  title: 'Lanche da Manhã',
                  calories: currentPlan?.meals?.[1]?.calories || 0,
                  status: currentHour >= 10 ? 'done' : 'pending'
                },
                { 
                  icon: Sun, 
                  time: '13:00', 
                  title: 'Almoço',
                  calories: currentPlan?.meals?.[2]?.calories || 0,
                  status: currentHour >= 13 ? 'done' : 'pending'
                },
                { 
                  icon: Apple, 
                  time: '16:00', 
                  title: 'Lanche da Tarde',
                  calories: currentPlan?.meals?.[3]?.calories || 0,
                  status: 'pending'
                },
                { 
                  icon: Moon, 
                  time: '19:00', 
                  title: 'Jantar',
                  calories: currentPlan?.meals?.[4]?.calories || 0,
                  status: 'pending'
                }
              ].map((meal, index) => {
                const Icon = meal.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-all cursor-pointer transform hover:scale-[0.99]"
                    onClick={() => navigate('/diet')}
                  >
                    <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center glow-effect">
                      <Icon className="text-primary-500" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">{meal.title}</h3>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="inline-block">{meal.time}</span>
                        <span className="inline-block">{meal.calories} kcal</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workout Section */}
          <div 
            onClick={() => navigate('/goals')}
            className="glass-morphism rounded-2xl overflow-hidden animate-slide-up delay-200 cursor-pointer hover:shadow-lg transition-all mb-4"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center float-effect">
                    <Dumbbell className="text-primary-500" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Treino de Hoje</h3>
                    <p className="text-xs text-gray-500">
                      {user?.goals?.type === 'loss' 
                        ? '45min Cardio' 
                        : user?.goals?.type === 'gain'
                        ? 'Musculação: Costas e Bíceps'
                        : '30min Cardio + Força'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
            
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Calorias</p>
                  <p className="text-sm font-medium">
                    {user?.goals?.type === 'loss' ? '400' : '300'} kcal
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Duração</p>
                  <p className="text-sm font-medium">
                    {user?.goals?.type === 'loss' ? '45' : '30'} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Intensidade</p>
                  <p className="text-sm font-medium">
                    {user?.goals?.type === 'loss' ? 'Alta' : 'Moderada'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div> 

        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}

export default Dashboard;