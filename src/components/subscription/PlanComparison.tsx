import React from 'react';
import { Check, X } from 'lucide-react';
import type { Plan } from '../../types/user';
import { plans } from '../../lib/plans';

interface PlanComparisonProps {
  selectedPlan?: Plan;
}

function PlanComparison({ selectedPlan }: PlanComparisonProps) {
  // Get all unique features across all plans
  const allFeatures = Array.from(
    new Set(
      plans.flatMap(plan => 
        plan.features.map(feature => feature.name)
      )
    )
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-4 bg-gray-50">Recursos</th>
            {plans.map(plan => (
              <th 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50'
                    : 'bg-gray-50'
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {allFeatures.map(featureName => (
            <tr key={featureName} className="hover:bg-gray-50">
              <td className="p-4 font-medium">{featureName}</td>
              {plans.map(plan => {
                const feature = plan.features.find(f => f.name === featureName);
                return (
                  <td 
                    key={plan.tier}
                    className={`p-4 text-center ${
                      selectedPlan?.tier === plan.tier
                        ? 'bg-primary-50/30'
                        : ''
                    }`}
                  >
                    {feature?.included ? (
                      <Check className="mx-auto text-green-500" size={20} />
                    ) : (
                      <X className="mx-auto text-gray-300" size={20} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          
          {/* Limits Section */}
          <tr className="bg-gray-50">
            <td colSpan={4} className="p-4 font-semibold">
              Limites Mensais
            </td>
          </tr>
          <tr>
            <td className="p-4">Planos Alimentares</td>
            {plans.map(plan => (
              <td 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50/30'
                    : ''
                }`}
              >
                {plan.limits.monthlyDietPlans === -1 
                  ? 'Ilimitado'
                  : plan.limits.monthlyDietPlans}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4">Consultas com Nutricionista</td>
            {plans.map(plan => (
              <td 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50/30'
                    : ''
                }`}
              >
                {plan.limits.nutritionistSessions === -1 
                  ? 'Ilimitado'
                  : plan.limits.nutritionistSessions}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4">Videoaulas</td>
            {plans.map(plan => (
              <td 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50/30'
                    : ''
                }`}
              >
                {plan.limits.videoLessons === -1 
                  ? 'Ilimitado'
                  : plan.limits.videoLessons}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4">Receitas Personalizadas</td>
            {plans.map(plan => (
              <td 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50/30'
                    : ''
                }`}
              >
                {plan.limits.customRecipes === -1 
                  ? 'Ilimitado'
                  : plan.limits.customRecipes}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4">Assistente IA</td>
            {plans.map(plan => (
              <td 
                key={plan.tier}
                className={`p-4 text-center ${
                  selectedPlan?.tier === plan.tier
                    ? 'bg-primary-50/30'
                    : ''
                }`}
              >
                {plan.limits.aiAssistant ? (
                  <Check className="mx-auto text-green-500" size={20} />
                ) : (
                  <X className="mx-auto text-gray-300" size={20} />
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PlanComparison;