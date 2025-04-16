import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Crown, ChevronRight } from 'lucide-react';
import type { Plan } from '../../types/user';

interface PlanCardProps {
  plan: Plan;
  isPopular?: boolean;
  onSelect: () => void;
  selected?: boolean;
}

function PlanCard({ plan, isPopular, onSelect, selected }: PlanCardProps) {
  const annualPrice = plan.price * 12 * (1 - (plan.discount || 0) / 100);
  const monthlyPrice = plan.price;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        ${selected 
          ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white' 
          : 'bg-white'
        }
        transition-all duration-300
        ${selected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      `}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -right-12 top-8 bg-primary-500 text-white px-12 py-1 rotate-45 text-sm font-medium">
          Mais Popular
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {plan.tier === 'premium-plus' ? (
            <Crown className={selected ? 'text-white' : 'text-primary-500'} size={24} />
          ) : plan.tier === 'premium' ? (
            <Star className={selected ? 'text-white' : 'text-primary-500'} size={24} />
          ) : (
            <Check className={selected ? 'text-white' : 'text-primary-500'} size={24} />
          )}
          <h3 className="text-xl font-semibold">{plan.name}</h3>
        </div>
        <p className={`text-sm ${selected ? 'text-white/80' : 'text-gray-500'}`}>
          {plan.description}
        </p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            R$ {monthlyPrice.toFixed(2)}
          </span>
          <span className={selected ? 'text-white/80' : 'text-gray-500'}>
            /mês
          </span>
        </div>
        {plan.discount && (
          <div className="mt-2">
            <p className="text-sm font-medium text-primary-500">
              Plano Anual:
            </p>
            <p className="text-sm">
              R$ {(annualPrice / 12).toFixed(2)}/mês
              <span className="ml-2 text-green-500">
                (Economia de R$ {annualSavings.toFixed(2)}/ano)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-4 mb-6">
        {plan.features.map((feature, index) => (
          <div 
            key={index}
            className={`flex items-start gap-3 ${
              feature.included 
                ? '' 
                : selected ? 'opacity-50' : 'text-gray-400'
            }`}
          >
            <div className={`
              mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
              ${feature.included
                ? selected
                  ? 'bg-white text-primary-500'
                  : 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-400'
              }
            `}>
              <Check size={12} />
            </div>
            <div>
              <p className="font-medium">{feature.name}</p>
              <p className={`text-sm ${
                selected ? 'text-white/70' : 'text-gray-500'
              }`}>
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={onSelect}
        className={`
          w-full py-3 rounded-xl font-medium
          flex items-center justify-center gap-2
          transition-colors
          ${selected
            ? 'bg-white text-primary-500 hover:bg-white/90'
            : 'bg-primary-500 text-white hover:bg-primary-600'
          }
        `}
      >
        <span>
          {selected ? 'Plano Selecionado' : 'Escolher Plano'}
        </span>
        <ChevronRight size={20} />
      </button>
    </motion.div>
  );
}

export default PlanCard;