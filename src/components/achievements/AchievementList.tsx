import React, { useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trophy, Star, Target, Calendar, Award, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { useAchievements } from '../../hooks/useAchievements';
import AchievementCard from './AchievementCard';
import type { UserProfile } from '../../types/user';

interface AchievementListProps {
  user: UserProfile;
  onClose: () => void;
}

function AchievementList({ user, onClose }: AchievementListProps) {
  const { achievements, progress, isLoading } = useAchievements(user);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [showStats, setShowStats] = useState(false);

  const virtualizer = useVirtualizer({
    count: achievements.data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center">
              <Trophy className="text-primary-500" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Conquistas</h2>
              <p className="text-sm text-gray-500">
                Nível {progress.data?.level || 1}
              </p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Experiência</span>
              <span className="text-sm font-medium">
                {progress.data?.experience || 0} / {progress.data?.nextLevelThreshold || 100} XP
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ 
                  width: `${((progress.data?.experience || 0) / (progress.data?.nextLevelThreshold || 100)) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Trophy className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-semibold">{progress.data?.total || 0}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Star className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">Completas</p>
              <p className="font-semibold">{progress.data?.completed || 0}</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center mb-1">
                <Target className="text-primary-500" size={20} />
              </div>
              <p className="text-sm text-gray-600">Em Progresso</p>
              <p className="font-semibold">{progress.data?.inProgress || 0}</p>
            </div>
          </div>

          {/* Stats Details */}
          <div className="mb-6">
            <button
              onClick={() => setShowStats(!showStats)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Coins className="text-primary-500" size={20} />
                <span className="font-medium">Estatísticas Detalhadas</span>
              </div>
              {showStats ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {showStats && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium mb-2">Sequência de Check-in</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Atual</p>
                      <p className="text-xl font-semibold">{user.dailyStreak?.currentStreak || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recorde</p>
                      <p className="text-xl font-semibold">{user.dailyStreak?.longestStreak || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium mb-2">Moedas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-semibold">{user.totalCoins || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Disponível</p>
                      <p className="text-xl font-semibold">{user.totalCoins || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievement List */}
        <div 
          ref={parentRef}
          className="flex-1 overflow-auto"
          style={{ height: `calc(90vh - 200px)` }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const achievement = achievements.data?.[virtualItem.index];
              if (!achievement) return null;

              return (
                <div
                  key={achievement.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                  className="p-2"
                >
                  <AchievementCard 
                    achievement={achievement}
                    onCollectReward={() => {
                      // Handle reward collection
                      console.log('Collect reward for:', achievement.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default AchievementList;