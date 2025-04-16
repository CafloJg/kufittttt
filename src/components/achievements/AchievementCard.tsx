import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Target, Calendar, Award } from 'lucide-react';
import type { Achievement } from '../../types/user';

interface AchievementCardProps {
  achievement: Achievement;
  onCollectReward?: () => void;
}

const ICON_MAP = {
  trophy: Trophy,
  star: Star,
  target: Target,
  calendar: Calendar,
  award: Award
};

const AchievementCard = memo(({ achievement, onCollectReward }: AchievementCardProps) => {
  const Icon = ICON_MAP[achievement.icon as keyof typeof ICON_MAP] || Trophy;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl p-6 
        ${achievement.completed 
          ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white' 
          : 'bg-white'
        }
        transition-all duration-300 transform hover:scale-[1.02]
        ${achievement.completed ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      `}
    >
      {/* Background Decoration */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${achievement.completed 
              ? 'bg-white/20' 
              : 'bg-primary-50'
            }
          `}>
            <Icon 
              size={24} 
              className={achievement.completed ? 'text-white' : 'text-primary-500'} 
            />
          </div>
          <div>
            <h3 className="font-semibold">{achievement.title}</h3>
            <p className={`text-sm ${achievement.completed ? 'text-white/80' : 'text-gray-500'}`}>
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className={achievement.completed ? 'text-white/80' : 'text-gray-500'}>
              Progresso
            </span>
            <span className="font-medium">
              {achievement.requirements.current} / {achievement.requirements.target}
            </span>
          </div>
          <div className={`
            h-2 rounded-full overflow-hidden
            ${achievement.completed ? 'bg-white/20' : 'bg-gray-100'}
          `}>
            <div 
              className={`
                h-full transition-all duration-500 ease-out
                ${achievement.completed 
                  ? 'bg-white' 
                  : 'bg-primary-500'
                }
              `}
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
        </div>

        {/* Reward */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className={achievement.completed ? 'text-white' : 'text-primary-500'} />
            <span className="text-sm font-medium">
              {achievement.reward_coins} moedas
            </span>
          </div>
          
          {achievement.completed && !achievement.completedAt && onCollectReward && (
            <button
              onClick={onCollectReward}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Coletar
            </button>
          )}
        </div>

        {/* Completion Badge */}
        {achievement.completed && achievement.completedAt && (
          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
            <Award size={12} />
            <span>Completo</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

AchievementCard.displayName = 'AchievementCard';

export default AchievementCard;