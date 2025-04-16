import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Star, Crown, Check, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import PlanCard from '../components/subscription/PlanCard';
import PlanComparison from '../components/subscription/PlanComparison';
import { plans } from '../lib/plans';
import type { Plan } from '../types/user';

function Subscription() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | undefined>();
  const [showComparison, setShowComparison] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);

  const faqItems = [
    {
      question: 'Posso trocar de plano depois?',
      answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As alterações entram em vigor no próximo ciclo de cobrança.'
    },
    {
      question: 'Como funciona o período de teste?',
      answer: 'Oferecemos 7 dias de garantia em todos os planos. Se você não estiver satisfeito, devolvemos 100% do valor pago.'
    },
    {
      question: 'Preciso de cartão de crédito?',
      answer: 'Aceitamos diversas formas de pagamento: cartão de crédito, PIX e boleto bancário.'
    },
    {
      question: 'Como funciona o suporte nutricional?',
      answer: 'O suporte varia conforme o plano. No Premium+ você tem acesso 24/7 a nutricionistas, enquanto no Premium o suporte é em horário comercial estendido.'
    }
  ];

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    // Scroll to pricing section
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transforme sua saúde com acompanhamento nutricional personalizado
          </p>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="text-primary-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">7 Dias de Garantia</h3>
            <p className="text-gray-600">
              Satisfação garantida ou seu dinheiro de volta
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="text-primary-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nutricionistas Experts</h3>
            <p className="text-gray-600">
              Profissionais especializados para seu objetivo
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="text-primary-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Plano Premium</h3>
            <p className="text-gray-600">
              Recursos exclusivos para acelerar resultados
            </p>
          </div>
        </div>

        {/* Plans */}
        <div id="pricing" className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isPopular={index === 1}
              selected={selectedPlan?.tier === plan.tier}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </div>

        {/* Plan Comparison */}
        <div className="mb-16">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all mb-4"
          >
            <div className="flex items-center gap-2">
              <Star className="text-primary-500" size={20} />
              <span className="font-medium">Comparar Planos</span>
            </div>
            {showComparison ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>

          {showComparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <PlanComparison selectedPlan={selectedPlan} />
            </motion.div>
          )}
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all mb-4"
          >
            <div className="flex items-center gap-2">
              <Shield className="text-primary-500" size={20} />
              <span className="font-medium">Perguntas Frequentes</span>
            </div>
            {showFAQ ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>

          {showFAQ && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {faqItems.map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-gray-600">{item.answer}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* CTA */}
        {selectedPlan && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedPlan.name}</p>
                <p className="text-sm text-gray-500">
                  R$ {selectedPlan.price.toFixed(2)}/mês
                </p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <span>Continuar</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscription;