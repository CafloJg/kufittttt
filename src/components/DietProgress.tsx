import React, { useState } from 'react';
import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'; 
import { Activity, TrendingUp, Target, Award, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'; 
import { motion } from 'framer-motion'; 
import type { DietPlan } from '../types/user'; 
import { useRef } from 'react'; 
import { useUser } from '../context/UserContext';  
import { useDietContext } from '../context/DietContext'; 
import { useNavigate } from 'react-router-dom';

// Helper to force component updates
const generateKey = () => `progress-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface DietProgressProps extends React.PropsWithChildren {
  plans?: DietPlan[];
  days?: number;
  completedMeals?: string[];
  currentPlan: DietPlan | null;
  onUpdate?: () => void;
}

function DietProgress({ plans, days = 7, completedMeals, currentPlan, onUpdate }: DietProgressProps) {
  const { user } = useUser();
  const { refreshPlan, generatePlan } = useDietContext();
  const [key, setKey] = useState(generateKey());
  const [showWeeklyProgress, setShowWeeklyProgress] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const updateInProgressRef = useRef(false);
  const lastCompletedMealsCountRef = useRef(0);
  const [updateKey, setUpdateKey] = useState(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  // Debug useEffect para verificar a disponibilidade de generatePlan
  useEffect(() => {
    console.log('DietProgress - generatePlan disponível?', !!generatePlan);
    console.log('DietProgress - onUpdate disponível?', !!onUpdate);
    console.log('DietProgress - user disponível?', !!user);
    console.log('DietProgress - userProfile weight:', user?.weight);
    console.log('DietProgress - userProfile height:', user?.height);
    console.log('DietProgress - userProfile age:', user?.age);
    console.log('DietProgress - userProfile gender:', user?.gender);
    console.log('DietProgress - userProfile dietType:', user?.dietType);
    console.log('DietProgress - userProfile goals:', user?.goals);
  }, [generatePlan, onUpdate, user]);

  // Force re-render when props change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const forceUpdate = () => {
      // Prevenir atualizações em excesso
      if (updateInProgressRef.current) return;
      
      updateInProgressRef.current = true;
      lastCompletedMealsCountRef.current = completedMealsCount;
      setUpdateKey(Date.now());
      setKey(generateKey());
      setLastUpdate(lastUpdated);
      
      // Reset the update ref after a short delay
      setTimeout(() => {
        updateInProgressRef.current = false;
      }, 1000); // Aumentado de 500ms para 1000ms
    };
    
    // Get completed meals from all possible sources
    const planCompletedMeals = currentPlan?.dailyStats?.completedMeals?.[today] || [];
    const userCompletedMeals = user?.dailyStats?.completedMeals?.[today] || [];
    const propCompletedMeals = completedMeals || [];
    
    // Combine all sources without duplicates
    const allCompletedMeals = [...new Set([
      ...planCompletedMeals,
      ...userCompletedMeals,
      ...propCompletedMeals
    ])];
    
    const completedMealsCount = allCompletedMeals.length;
    const lastUpdated = currentPlan?.dailyStats?.lastUpdated || user?.dailyStats?.lastUpdated || null;
    
    // Prevent unnecessary updates by checking if the data has actually changed
    const hasNewData = 
      (lastUpdated !== lastUpdate && lastUpdated !== null) || 
      (completedMealsCount !== lastCompletedMealsCountRef.current && completedMealsCount > 0);
    
    if (hasNewData && !updateInProgressRef.current && currentPlan) {
      // Usar timeout para debounce das atualizações
      const debounceTimer = setTimeout(() => {
        forceUpdate();
      }, 300);
      
      return () => clearTimeout(debounceTimer);
    }
    
    // Set up a refresh interval to ensure data is always up-to-date
    const refreshInterval = setInterval(() => {
      if (refreshPlan && !updateInProgressRef.current) {
        refreshPlan().then(() => {
          // Evitar atualização desnecessária verificando se os dados mudaram significativamente
          if (lastUpdated !== lastUpdate && lastUpdated !== null) {
            forceUpdate();
          }
        }).catch(console.error);
      }
    }, 30000); // Aumentado de 5000 para 30000 (30 segundos)
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [
    currentPlan, // Reduzir dependências para focar apenas no essencial 
    lastUpdate,
    refreshPlan,
    completedMeals
  ]);

  // Force refresh when component mounts - apenas uma vez
  useEffect(() => {
    // Validar se realmente precisamos fazer refresh no mount
    let isMounted = true;
    
    if (refreshPlan && onUpdate && isMounted) {
      // Usar setTimeout para evitar chamadas imediatas
      const initialLoadTimer = setTimeout(() => {
        refreshPlan().catch(error => {
          console.error('Erro ao carregar dados iniciais:', error);
        });
      }, 500);
      
      return () => {
        isMounted = false;
        clearTimeout(initialLoadTimer);
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // Removendo dependências para executar apenas uma vez no mount

  // Função para lidar com o clique no botão de gerar novo plano
  const handleGeneratePlan = async () => {
    console.log("handleGeneratePlan chamado - verificando usuário...");
    
    if (!user) {
      alert("Você precisa estar logado para gerar um plano alimentar.");
      return;
    }
    
    // Verificar se o perfil está completo
    const missingData = [];
    if (!user.weight) missingData.push("peso");
    if (!user.height) missingData.push("altura");
    if (!user.age) missingData.push("idade");
    if (!user.gender) missingData.push("gênero");
    if (!user.dietType) missingData.push("tipo de dieta");
    if (!user.goals?.type) missingData.push("objetivos");
    
    if (missingData.length > 0) {
      const message = `Seu perfil está incompleto. Você precisa adicionar: ${missingData.join(", ")}.`;
      console.log("Perfil incompleto:", message);
      
      if (confirm(message + " Deseja ir para a página de perfil para completar seus dados?")) {
        navigate('/profile');
      }
      return;
    }
    
    // Evitar múltiplos cliques
    if (isGenerating) {
      return;
    }
    
    console.log("Iniciando geração de plano...");
    setIsGenerating(true);
    
    try {
      if (generatePlan) {
        console.log("Chamando generatePlan do contexto...");
        await generatePlan();
      } else if (onUpdate) {
        console.log("Usando fallback para onUpdate...");
        onUpdate();
      } else {
        console.error("Nenhuma função de geração de plano disponível");
        alert("Não foi possível gerar um novo plano. Tente novamente mais tarde.");
      }
    } catch (error) {
      console.error("Erro ao gerar plano:", error);
      alert(`Erro ao gerar plano: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Ensure we have a valid currentPlan
  if (!currentPlan) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum plano alimentar encontrado.</p>
          <p className="text-sm text-gray-400 mt-2">Gere um plano para ver seu progresso.</p>
        </div>
      </div>
    );
  }

  // Sort plans by date and get the last N days if plans exist
  const sortedPlans = plans ? [...plans]
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
    .slice(0, days || 7)
    .reverse() : []; // Reverse to show oldest to newest

  // Get today's plan and stats
  const today = new Date().toISOString().split('T')[0];
  const todayPlan = currentPlan;
  const userDailyStats = user?.dailyStats || {};
  
  // Get completed meals from the most up-to-date source
  const todayMeals = React.useMemo(() => {
    // Combine all sources of completed meals
    const planCompletedMeals = currentPlan?.dailyStats?.completedMeals?.[today] || [];
    const userCompletedMeals = user?.dailyStats?.completedMeals?.[today] || [];
    const propCompletedMeals = completedMeals || [];
    
    // Return unique meal IDs
    return [...new Set([
      ...planCompletedMeals,
      ...userCompletedMeals,
      ...propCompletedMeals
    ])];
  }, [
    currentPlan?.dailyStats?.completedMeals, 
    user?.dailyStats?.completedMeals, 
    completedMeals,
    today
  ]);
  
  // Get daily targets from current plan
  const targets = {
    calories: currentPlan?.totalCalories || 0,
    protein: currentPlan?.proteinTarget || 0,
    carbs: currentPlan?.carbsTarget || 0,
    fat: currentPlan?.fatTarget || 0
  };

  // Get consumed values from daily stats - recalculate on every render
  const consumed = React.useMemo(() => ({
    calories: currentPlan?.dailyStats?.caloriesConsumed || userDailyStats.caloriesConsumed || 0,
    protein: currentPlan?.dailyStats?.proteinConsumed || userDailyStats.proteinConsumed || 0,
    carbs: currentPlan?.dailyStats?.carbsConsumed || userDailyStats.carbsConsumed || 0,
    fat: currentPlan?.dailyStats?.fatConsumed || userDailyStats.fatConsumed || 0
  }), [updateKey, 
    currentPlan?.dailyStats?.caloriesConsumed,
    currentPlan?.dailyStats?.proteinConsumed,
    currentPlan?.dailyStats?.carbsConsumed,
    currentPlan?.dailyStats?.fatConsumed,
    userDailyStats.caloriesConsumed,
    userDailyStats.proteinConsumed,
    userDailyStats.carbsConsumed,
    userDailyStats.fatConsumed,
    key, // Include key to ensure recalculation when component is forced to update
    todayMeals.length, // Add this to ensure recalculation when meals are completed
    currentPlan?.dailyStats?.lastUpdated, // Add this to ensure recalculation when stats are updated
    userDailyStats.lastUpdated // Add this to ensure recalculation when user stats are updated
  ]);

  const todayStats = {
    totalMeals: todayPlan?.meals?.length ?? 0,
    completedMeals: todayMeals.length,
    nextMeal: todayPlan?.meals?.find(meal => !todayMeals.includes(meal.id)),
    calories: consumed.calories || 0,
    protein: consumed.protein || 0,
    carbs: consumed.carbs || 0,
    fat: consumed.fat || 0,
    macroDistribution: todayPlan?.dailyStats?.macroDistribution || {
      protein: 0,
      carbs: 0,
      fat: 0
    },
    target: targets.calories,
    progress: targets.calories > 0 ? Math.min(
      Math.round((consumed.calories / targets.calories) * 100), 100
    ) : 0
  };

  const chartData = sortedPlans.map(plan => ({
    date: new Date(plan.date || plan.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }),
    calories: plan === todayPlan ? consumed.calories : plan.dailyStats?.caloriesConsumed || 0,
    protein: plan === todayPlan ? consumed.protein : plan.dailyStats?.proteinConsumed || 0,
    carbs: plan === todayPlan ? consumed.carbs : plan.dailyStats?.carbsConsumed || 0,
    fat: plan === todayPlan ? consumed.fat : plan.dailyStats?.fatConsumed || 0,
    macroDistribution: plan === todayPlan ? todayStats.macroDistribution : plan.dailyStats?.macroDistribution || {
      protein: 0,
      carbs: 0,
      fat: 0
    },
    target: plan.totalCalories,
    proteinTarget: plan.proteinTarget,
    carbsTarget: plan.carbsTarget,
    fatTarget: plan.fatTarget
  }));

  // Calculate averages and streaks
  const stats = (chartData ?? []).reduce((acc, day) => ({
    calories: acc.calories + day.calories,
    protein: acc.protein + day.protein,
    carbs: acc.carbs + day.carbs,
    fat: acc.fat + day.fat,
    onTarget: acc.onTarget + ((day.completedMeals ?? 0) > 0 ? 1 : 0),
    streak: (day.completedMeals ?? 0) > 0 ? acc.streak + 1 : 0
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    onTarget: 0,
    streak: 0
  });

  const averages = {
    calories: (chartData?.length ?? 0) > 0 ? Math.round(stats.calories / chartData.length) : 0,
    protein: (chartData?.length ?? 0) > 0 ? Math.round(stats.protein / chartData.length) : 0,
    carbs: (chartData?.length ?? 0) > 0 ? Math.round(stats.carbs / chartData.length) : 0,
    fat: (chartData?.length ?? 0) > 0 ? Math.round(stats.fat / chartData.length) : 0,
    adherence: (chartData?.length ?? 0) > 0 ? Math.round((stats.onTarget / chartData.length) * 100) : 0,
    streak: stats.streak
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm" key={key}>
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            Progresso da Dieta
          </h2>
          <button
            onClick={handleGeneratePlan}
            className="px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs whitespace-nowrap bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-md transform font-medium cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gerar novo plano alimentar"
            disabled={isGenerating}
          >
            <RefreshCw size={14} className={isGenerating ? "animate-spin" : "hover:rotate-180 transition-transform duration-500"} />
            <span className="font-medium">Gerar Novo Plano</span>
          </button>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span>{todayStats.completedMeals} de {todayStats.totalMeals} refeições</span>
          <span>•</span>
          <span>{consumed.calories} / {targets.calories} kcal</span>
        </div>
        <p className="text-xs text-primary-500 mt-1">Variação automática nas segundas, quartas e sextas</p>
        
        {/* Elemento de dias na meta reposicionado para baixo */}
        <div className="flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-full self-end mt-2">
          <Award className="text-primary-500" size={16} />
          <span className="text-sm font-medium text-primary-500">
            {averages.streak} dias na meta
          </span>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-600">Progresso de Hoje</span>
          <span className="text-sm font-bold text-primary-500">
            {todayStats.progress || 0}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300 shadow"
            style={{ 
              width: `${todayStats.progress || 0}%` 
            }}
          />
        </div>
        {todayStats.nextMeal && (
          <p className="text-sm text-gray-500 mt-2">
            Próxima refeição: {' '}
            <span className="font-medium text-primary-500">
              {todayStats.nextMeal.name} ({todayStats.nextMeal.time})
            </span>
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm opacity-80">Calorias Diárias</p>
              <p className="text-2xl font-semibold">{consumed.calories.toLocaleString()}</p>
              <p className="text-sm opacity-80">de {targets.calories} kcal</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm opacity-80">Proteína Diária</p>
              <p className="text-2xl font-semibold">{consumed.protein}g</p>
              <p className="text-sm opacity-80">média consumida</p>
            </div>
          </div>
        </div>
      </div>

      {/* Macros Distribution */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Distribuição de Macros</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-black/5 backdrop-blur-lg rounded-2xl p-4 relative overflow-hidden">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Proteínas</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold">{consumed.protein}</span>
                <span className="text-sm text-gray-500">g</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/5 backdrop-blur-lg rounded-2xl p-4 relative overflow-hidden">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Carboidratos</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold">{consumed.carbs}</span>
                <span className="text-sm text-gray-500">g</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/5 backdrop-blur-lg rounded-2xl p-4 relative overflow-hidden">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Gorduras</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold">{consumed.fat}</span>
                <span className="text-sm text-gray-500">g</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%" key={`chart-${key}`}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F840BA" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#F840BA" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={45}
                tickFormatter={(value) => `${value}k`}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="calories"
                stroke="#F840BA" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProgress)"
                animationDuration={1000}
                dot={{ r: 4, fill: "#F840BA", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#F840BA", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#E5E7EB"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Progress Toggle */}
      <div className="pt-4 border-t border-gray-100 space-y-4">
        <button
          onClick={() => setShowWeeklyProgress(!showWeeklyProgress)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-500" />
            <span>Progresso Semanal</span>
          </div>
          {showWeeklyProgress ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
      </div>

      {showWeeklyProgress && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-500"></span>
              Consumido
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              Meta
            </span>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F840BA" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F840BA" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                  tickFormatter={(value) => `${value}k`}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="#F840BA" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProgress)"
                  animationDuration={1000}
                  dot={{ r: 4, fill: "#F840BA", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#F840BA", strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#E5E7EB"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Média</p>
              <p className="font-semibold">{Math.round(averages.calories / 1000)}k kcal</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Menor</p>
              <p className="font-semibold">
                {chartData?.length ? Math.round(Math.min(...chartData.map(d => d.calories)) / 1000) : 0}k kcal
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Maior</p>
              <p className="font-semibold">
                {chartData?.length ? Math.round(Math.max(...chartData.map(d => d.calories)) / 1000) : 0}k kcal
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default DietProgress;