import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import type { DietPlan } from '../types/user';

interface DietCalendarStats {
  totalDays: number;
  completedDays: number;
  averageCalories: number;
  adherenceRate: number;
  streakDays: number;
}

interface DietCalendarProps {
  plans: DietPlan[];
  futurePlans: Record<string, DietPlan>;
  onSelectPlan: (plan: DietPlan) => void;
  onClose: () => void;
  currentDate?: string;
}

function DietCalendar({ plans, futurePlans, onSelectPlan, onClose, currentDate }: DietCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showingCurrentPlan, setShowingCurrentPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [today] = useState(new Date());
  const [dateRange] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 120); // 120 days in the past
    
    const end = new Date(today);
    end.setDate(today.getDate() + 15); // 15 days in the future
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  });
  const [stats, setStats] = useState<DietCalendarStats>(() => {
    const filteredPlans = plans.filter(plan => {
      const planDate = new Date(plan.date || plan.createdAt);
      return planDate >= dateRange.start && planDate <= dateRange.end;
    });

    const completedDays = filteredPlans.filter(plan => {
      const planDate = new Date(plan.date || plan.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only count completed days up to today
      if (planDate > today) return false;
      
      return plan.dailyStats?.completedMeals?.[planDate.toISOString().split('T')[0]]?.length > 0;
    }).length;

    const totalCalories = filteredPlans.reduce((sum, plan) => 
      sum + (plan.dailyStats?.caloriesConsumed || 0), 0
    );

    // Calculate streak
    let currentStreak = 0;
    const sortedPlans = [...filteredPlans].sort((a, b) => 
      new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );

    for (const plan of sortedPlans) {
      const planDate = new Date(plan.date || plan.createdAt);
      const completedMeals = plan.dailyStats?.completedMeals?.[planDate.toISOString().split('T')[0]]?.length || 0;
      
      if (completedMeals > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalDays: filteredPlans.length,
      completedDays,
      averageCalories: filteredPlans.length ? Math.round(totalCalories / filteredPlans.length) : 0,
      adherenceRate: filteredPlans.length ? Math.round((completedDays / filteredPlans.length) * 100) : 0,
      streakDays: currentStreak
    };
  });

  const [selectedDateStats, setSelectedDateStats] = useState<{
    totalMeals: number;
    completedMeals: number;
    calories: number;
    target: number;
  } | null>(null);

  // Load and cache plan data
  useEffect(() => {
    // Update stats when plans change
    const date = new Date();
    date.setDate(date.getDate() - 120);

    const filteredPlans = plans.filter(plan => {
      const planDate = new Date(plan.date || plan.createdAt);
      return planDate >= date;
    });

    const completedDays = filteredPlans.filter(plan => 
      plan.completedMeals && plan.completedMeals.length > 0
    ).length;

    const totalCalories = filteredPlans.reduce((sum, plan) => 
      sum + (plan.dailyStats?.caloriesConsumed || 0), 0
    );

    setStats({
      totalDays: filteredPlans.length,
      completedDays,
      averageCalories: filteredPlans.length ? Math.round(totalCalories / filteredPlans.length) : 0,
      adherenceRate: filteredPlans.length ? Math.round((completedDays / filteredPlans.length) * 100) : 0,
      streakDays: 0
    });
  }, [plans]);

  useEffect(() => {
    if (currentDate) {
      const date = new Date(currentDate);
      date.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      setCurrentMonth(date);
      setSelectedDate(date);
      setShowingCurrentPlan(true);
      
      const plan = getPlanForDate(date);
      if (plan) {
        const dateStr = date.toISOString().split('T')[0];
        setSelectedDateStats({
          totalMeals: plan.meals.length,
          completedMeals: plan.dailyStats?.completedMeals?.[dateStr]?.length || 0,
          calories: plan.dailyStats?.caloriesConsumed || 0,
          target: plan.totalCalories
        });
      }
    }
  }, [currentDate]);

  // Reset to today
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
    const todayPlan = getPlanForDate(now);
    if (todayPlan) {
      const dateStr = now.toISOString().split('T')[0];
      setSelectedDateStats({
        totalMeals: todayPlan.meals.length,
        completedMeals: todayPlan.dailyStats?.completedMeals?.[dateStr]?.length || 0,
        calories: todayPlan.dailyStats?.caloriesConsumed || 0,
        target: todayPlan.totalCalories
      });
      loadPlanData(now);
    }
  };

  // Optimize plan loading
  const loadPlanData = async (date: Date) => {
    setIsLoading(true);
    try {
      const plan = getPlanForDate(date);
      if (plan) {
        setSelectedPlan(plan);
        const today = new Date().toISOString().split('T')[0];
        const planDate = date.toISOString().split('T')[0];
        if (planDate !== today) {
          onSelectPlan(plan);
          onClose();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 15); // Show next 15 days
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      if (date <= maxDate) {
        days.push(date);
      }
    }
    
    return days;
  };

  const getPlanForDate = (date: Date): DietPlan | null => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check future plans first
    if (futurePlans[dateStr]) {
      return futurePlans[dateStr];
    }
    
    // Then check historical plans
    const plan = plans.find(plan => {
      const planDate = new Date(plan.date || plan.createdAt);
      return (
        planDate.getDate() === date.getDate() &&
        planDate.getMonth() === date.getMonth() &&
        planDate.getFullYear() === date.getFullYear()
      );
    });

    // Get stats for this date if they exist
    const stats = plans.find(p => p.date === dateStr)?.dailyStats;
    
    if (stats && plan) {
      return {
        ...plan,
        dailyStats: stats
      };
    }

    return plan;
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const prevMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    if (newDate >= dateRange.start) {
      setCurrentMonth(newDate);
    }
  };

  const handleDateClick = async (date: Date) => {
    if (date < dateRange.start || date > dateRange.end) return;
    setSelectedDate(date);
    
    const plan = getPlanForDate(date);
    if (plan) {
      const dateStr = date.toISOString().split('T')[0];
      setSelectedDateStats({
        totalMeals: plan.meals.length,
        completedMeals: plan.dailyStats?.completedMeals?.[dateStr]?.length || 0,
        calories: plan.dailyStats?.caloriesConsumed || 0,
        target: plan.totalCalories
      });
    }
    
    await loadPlanData(date);
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {showingCurrentPlan && (
                <button
                  onClick={goToToday}
                  className="p-2 hover:bg-gray-100 rounded-lg mr-2"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {showingCurrentPlan ? 'Plano Atual' : 'Histórico de Dietas'}
                </h3>
                <p className="text-sm text-gray-500">
                  {showingCurrentPlan 
                    ? new Date(currentDate!).toLocaleDateString('pt-BR', { 
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'Selecione uma data para ver o plano'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth()) < dateRange.start}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="font-medium">
                {currentMonth.toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </h4>
              <button
                onClick={nextMonth}
                disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) > dateRange.end}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Today Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={goToToday}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedDate?.toDateString() === today.toDateString()
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hoje
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
              
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} />;
                }

                const plan = getPlanForDate(date);
                const isSelected = selectedDate && 
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();
                const isToday = date.toDateString() === today.toDateString();
                const isDisabled = date < dateRange.start || !plan;
                const isHovered = hoveredDate && 
                  date.getDate() === hoveredDate.getDate() &&
                  date.getMonth() === hoveredDate.getMonth() &&
                  date.getFullYear() === hoveredDate.getFullYear();

                return (
                  <button
                    key={date.getTime()}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => setHoveredDate(date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    disabled={isDisabled}
                    className={`aspect-square p-3 rounded-xl relative transition-all duration-200 ${
                      date < dateRange.start || date > dateRange.end
                        ? 'opacity-50 cursor-not-allowed'
                        : plan
                        ? 'hover:bg-primary-100 hover:shadow-md cursor-pointer'
                        : 'cursor-default'
                    } ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg ring-2 ring-primary-300'
                        : isToday
                        ? 'bg-primary-50 font-bold shadow-sm'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isToday ? 'text-primary-700' : ''}`}>
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                    )}
                    {isToday && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                    )}
                    {/* Progress Indicator */}
                    {plan && (
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-gray-100">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isSelected ? 'bg-white' : 'bg-primary-500'
                          }`}
                          style={{ 
                            width: `${Math.round((plan.dailyStats?.caloriesConsumed || 0) / plan.totalCalories * 100)}%` 
                          }}
                        />
                      </div>
                    )}
                    {/* Completion Star */}
                    {plan?.dailyStats?.completedMeals?.[date.toISOString().split('T')[0]]?.length > 0 && (
                      <div className={`absolute top-1 right-1 ${
                        isSelected ? 'text-white' : 'text-primary-500'
                      }`}>
                        <Star size={12} className="fill-current" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Summary */}
          {selectedDate && selectedDateStats && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {selectedDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long'
                })}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Refeições Completas</p>
                  <p className="text-lg font-semibold">
                    {selectedDateStats.completedMeals}/{selectedDateStats.totalMeals}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Calorias</p>
                  <p className="text-lg font-semibold">
                    {Math.round((selectedDateStats.calories / selectedDateStats.target) * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ 
                    width: `${Math.round((selectedDateStats.calories / selectedDateStats.target) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Média</p>
              <p className="font-semibold">{stats.averageCalories} kcal</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg relative overflow-hidden">
              <div className={`absolute inset-0 bg-primary-50 transition-all duration-300`} 
                   style={{ width: `${stats.adherenceRate}%` }} />
              <div className="relative">
                <p className="text-gray-500">Aderência</p>
                <p className="font-semibold">{stats.adherenceRate}%</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Sequência</p>
              <p className="font-semibold">{stats.streakDays} dias</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-6">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
              <span>Plano salvo</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={12} className="fill-primary-500 text-primary-500" />
              <span>Refeições completas</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-2">
            {showingCurrentPlan ? (
              'Volte ao histórico para ver outros dias'
            ) : (
              'Histórico limitado aos últimos 120 dias'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DietCalendar