import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TabItem {
  /**
   * ID único da tab
   */
  id: string;
  
  /**
   * Rótulo da tab
   */
  label: React.ReactNode;
  
  /**
   * Conteúdo da tab
   */
  content: React.ReactNode;
  
  /**
   * Ícone da tab (opcional)
   */
  icon?: React.ReactNode;
  
  /**
   * Se a tab está desabilitada
   * @default false
   */
  disabled?: boolean;
}

interface TabsProps {
  /**
   * Lista de tabs
   */
  tabs: TabItem[];
  
  /**
   * ID da tab ativa
   */
  activeTab?: string;
  
  /**
   * Callback quando uma tab é selecionada
   */
  onChange?: (tabId: string) => void;
  
  /**
   * Variante visual das tabs
   * @default 'underline'
   */
  variant?: 'underline' | 'pills' | 'enclosed' | 'unstyled';
  
  /**
   * Alinhamento das tabs
   * @default 'start'
   */
  align?: 'start' | 'center' | 'end' | 'stretch';
  
  /**
   * Se deve mostrar animação
   * @default true
   */
  animated?: boolean;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

/**
 * Componente de tabs reutilizável
 */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  align = 'start',
  animated = true,
  className = '',
  ...props
}: TabsProps) {
  // Estado local para a tab ativa (caso não seja controlado externamente)
  const [activeTabState, setActiveTabState] = useState(activeTab || tabs[0]?.id);
  
  // Tab ativa atual (controlada ou não)
  const currentTab = activeTab || activeTabState;
  
  // Manipular clique na tab
  const handleTabClick = (tabId: string) => {
    if (onChange) {
      onChange(tabId);
    } else {
      setActiveTabState(tabId);
    }
  };
  
  // Mapeamento de variantes para classes
  const variantClasses = {
    underline: {
      list: 'border-b border-gray-200',
      tab: 'px-4 py-2 border-b-2 border-transparent',
      activeTab: 'border-b-2 border-primary-500 text-primary-600 font-medium'
    },
    pills: {
      list: 'space-x-2',
      tab: 'px-4 py-2 rounded-full',
      activeTab: 'bg-primary-500 text-white font-medium'
    },
    enclosed: {
      list: 'border-b border-gray-200',
      tab: 'px-4 py-2 border border-transparent border-b-0 rounded-t-lg',
      activeTab: 'bg-white border-gray-200 border-b-white text-primary-600 font-medium'
    },
    unstyled: {
      list: '',
      tab: 'px-4 py-2',
      activeTab: 'text-primary-600 font-medium'
    }
  };
  
  // Mapeamento de alinhamentos para classes
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    stretch: 'justify-between'
  };
  
  return (
    <div className={className} {...props}>
      {/* Lista de tabs */}
      <div className={`flex ${alignClasses[align]} ${variantClasses[variant].list} mb-4`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            className={`
              relative flex items-center gap-2 transition-all
              ${variantClasses[variant].tab}
              ${currentTab === tab.id ? variantClasses[variant].activeTab : 'text-gray-500 hover:text-gray-700'}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            disabled={tab.disabled}
            role="tab"
            aria-selected={currentTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            <span>{tab.label}</span>
            
            {/* Indicador animado (apenas para variante underline) */}
            {variant === 'underline' && currentTab === tab.id && animated && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                layoutId="underline"
              />
            )}
          </button>
        ))}
      </div>
      
      {/* Conteúdo da tab ativa */}
      <div className="tab-content">
        {animated ? (
          <AnimatedTabContent
            tabs={tabs}
            currentTab={currentTab}
          />
        ) : (
          tabs.find(tab => tab.id === currentTab)?.content
        )}
      </div>
    </div>
  );
}

/**
 * Componente para animar a transição entre conteúdos de tabs
 */
function AnimatedTabContent({ tabs, currentTab }: { tabs: TabItem[]; currentTab: string }) {
  return (
    <AnimatePresence mode="wait">
      {tabs.map(tab => (
        tab.id === currentTab && (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
          >
            {tab.content}
          </motion.div>
        )
      ))}
    </AnimatePresence>
  );
}