import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, TrendingUp, Calendar, Award, ChevronDown, ChevronUp } from 'lucide-react';
import type { CustomGoal } from '../../types/user';

interface GoalProgressProps {
  goal: CustomGoal;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

function GoalProgress({ goal, showDetails = false, onToggleDetails }: GoalProgressProps) {
  // Process check-in data for charts
  const checkInData = Object.entries(goal.checkIns)
    .map(([date, checkIn]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      }),
      value: checkIn.value,
      target: goal.target
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate statistics
  const stats = {
    total: checkInData.reduce((sum, day) => sum + day.value, 0),
    average: checkInData.length > 0 
      ? checkInData.reduce((sum, day) => sum + day.value, 0) / checkInData.length 
      : 0,
    best: Math.max(...checkInData.map(day => day.value), 0),
    worst: Math.min(...checkInData.map(day => day.value), 0),
    consistency: checkInData.length > 0
      ? (checkInData.filter(day => day.value >= goal.target).length / checkInData.length) * 100
      : 0
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-primary-500">●</span> Valor: {payload[0]?.value}
          </p>
          <p className="text-sm">
            <span className="text-gray-300">●</span> Meta: {payload[1]?.value}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
            {goal.type === 'nutrition' ? (
              <Activity className="text-primary-500" size={24} />
            ) : goal.type === 'hydration' ? (
              <TrendingUp className="text-primary-500" size={24} />
            ) : (
              <Calendar className="text-primary-500" size={24} />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            <p className="text-sm text-gray-500">
              Meta: {goal.target} {goal.unit}
            </p>
          </div>
        </div>
        {onToggleDetails && (
          <button
            onClick={onToggleDetails}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showDetails ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">Progresso</p>
          <p className="text-2xl font-semibold text-primary-500">
            {Math.round(goal.progress)}%
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">Consistência</p>
          <p className="text-2xl font-semibold text-primary-500">
            {Math.round(stats.consistency)}%
          </p>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="mb-6">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={checkInData}>
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
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

      {/* Detailed Stats */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Média</p>
              <p className="font-semibold">
                {stats.average.toFixed(1)} {goal.unit}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Melhor</p>
              <p className="font-semibold text-green-500">
                {stats.best} {goal.unit}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-semibold">
                {stats.total} {goal.unit}
              </p>
            </div>
          </div>

          {/* Check-in History */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Histórico de Check-ins
            </h4>
            <div className="space-y-2">
              {Object.entries(goal.checkIns)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .slice(0, 5)
                .map(([date, checkIn]) => (
                  <div 
                    key={date}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {checkIn.value} {goal.unit}
                      </p>
                    </div>
                    {checkIn.mood && (
                      <span className="text-2xl">
                        {checkIn.mood === 'great' ? '🤩' :
                         checkIn.mood === 'good' ? '😊' :
                         checkIn.mood === 'okay' ? '😐' : '😔'}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Achievement Badge */}
          {goal.status === 'completed' && (
            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
              <Award className="text-primary-500" size={24} />
              <div>
                <p className="font-medium">Meta Concluída!</p>
                <p className="text-sm text-gray-600">
                  Parabéns por atingir seu objetivo
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default GoalProgress;