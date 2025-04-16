import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Utensils, Target, MessageSquare, X, Calendar, Activity, Droplet, Apple, RefreshCw, ShoppingCart, Calculator, Coins, Info, Check } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface TutorialProps {
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: string;
    highlight?: boolean;
  }[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Check-in Diário',
    description: 'Primeiro passo: Faça seu check-in',
    icon: <Home className="text-primary-500" size={32} />,
    features: [
      {
        icon: <Calendar size={20} />,
        title: 'Como fazer check-in',
        description: 'Clique no botão de check-in na tela inicial para reiniciar suas refeições diárias',
        action: 'Encontre o botão de check-in no topo da página inicial',
        highlight: true
      }
    ]
  },
  {
    title: 'Configure suas Metas',
    description: 'Segundo passo: Defina seus objetivos',
    icon: <Target className="text-primary-500" size={32} />,
    features: [
      {
        icon: <Target size={20} />,
        title: 'Criar Meta',
        description: 'Defina suas metas de peso, água e nutrição',
        action: 'Acesse a aba Metas e clique no botão + para adicionar',
        highlight: true
      }
    ]
  },
  {
    title: 'Gerar Plano Alimentar',
    description: 'Terceiro passo: Crie seu plano',
    icon: <Utensils className="text-primary-500" size={32} />,
    features: [
      {
        icon: <RefreshCw size={20} />,
        title: 'Gerar Plano',
        description: 'Gere um plano alimentar personalizado baseado em suas metas',
        action: 'Na aba Dieta, clique no botão de atualização no topo',
        highlight: true
      }
    ]
  },
  {
    title: 'Marcar Refeições',
    description: 'Quarto passo: Registre suas refeições',
    icon: <Activity className="text-primary-500" size={32} />,
    features: [
      {
        icon: <Activity size={20} />,
        title: 'Completar Refeições',
        description: 'Marque cada refeição como concluída após consumir',
        action: 'Clique em "Marcar como Concluída" após cada refeição',
        highlight: true
      }
    ]
  },
  {
    title: 'Suporte e Ajuda',
    description: 'Quinto passo: Tire suas dúvidas',
    icon: <MessageSquare className="text-primary-500" size={32} />,
    features: [
      {
        icon: <MessageSquare size={20} />,
        title: 'Chat com Nutricionista',
        description: 'Tire suas dúvidas com nossa nutricionista 24h por dia',
        action: 'Acesse a aba Chat para conversar',
        highlight: true
      }
    ]
  }
];

function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = async () => {
    setIsVisible(false);
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          showTutorial: false, // Set to false to never show again
          updatedAt: new Date().toISOString()
        });
        onComplete();
      } catch (error) {
        console.error('Error updating tutorial status:', error);
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Semi-transparent overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          {/* Tutorial content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative flex-1 flex items-center justify-center p-4 pointer-events-auto"
          >
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                      {tutorialSteps[currentStep].icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {tutorialSteps[currentStep].title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {tutorialSteps[currentStep].description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Features Grid */}
                <div className="space-y-4 mb-8">
                  {tutorialSteps[currentStep].features?.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 sm:p-5 rounded-xl transition-all relative overflow-hidden ${
                        feature.highlight
                          ? 'bg-gradient-to-br from-primary-50/80 to-primary-100/50 border border-primary-100/50 shadow-sm'
                          : 'bg-gray-50'
                      }`}
                    >
                      {feature.highlight && (
                        <div className="absolute top-0 right-0 z-10">
                          <div className="bg-primary-500/10 p-1.5 rounded-bl-xl">
                            <Check size={14} className="text-primary-500" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transform hover:scale-110 transition-transform ${
                          feature.highlight ? 'bg-primary-100' : 'bg-white'
                        }`}>
                          <div className="text-primary-500">
                            <div className="w-5 h-5 sm:w-6 sm:h-6">{feature.icon}</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{feature.title}</h3>
                          <p className="text-xs sm:text-sm leading-relaxed text-gray-600 mb-2">{feature.description}</p>
                          {feature.action && (
                            <p className="flex items-center gap-2 text-xs sm:text-sm text-primary-500 font-medium bg-primary-50/50 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg shadow-sm">
                              <Info size={14} />
                              <span>{feature.action}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 sm:pt-8 mt-auto">
                  <div className="flex gap-1">
                    {tutorialSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentStep
                            ? 'bg-gradient-to-r from-primary-500 to-secondary-500 w-10'
                            : index < currentStep
                            ? 'bg-primary-200 w-4'
                            : 'bg-gray-200 w-4'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all font-semibold"
                  >
                    <span>
                      {currentStep === tutorialSteps.length - 1 ? 'Começar' : 'Próximo'}
                    </span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Tutorial;