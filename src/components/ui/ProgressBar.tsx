import React from 'react';

interface ProgressBarProps {
  /**
   * Valor atual do progresso (0-100)
   */
  value: number;
  
  /**
   * Valor máximo do progresso
   * @default 100
   */
  max?: number;
  
  /**
   * Altura da barra de progresso
   * @default 'md'
   */
  height?: 'xs' | 'sm' | 'md' | 'lg';
  
  /**
   * Cor da barra de progresso
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  
  /**
   * Se deve mostrar o valor em porcentagem
   * @default false
   */
  showValue?: boolean;
  
  /**
   * Se deve mostrar o valor dentro da barra de progresso
   * @default false
   */
  valueInside?: boolean;
  
  /**
   * Se deve mostrar uma animação de gradiente
   * @default false
   */
  animated?: boolean;
  
  /**
   * Se deve mostrar uma animação de pulso
   * @default false
   */
  pulse?: boolean;
  
  /**
   * Rótulo para a barra de progresso
   */
  label?: string;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

/**
 * Componente de barra de progresso reutilizável
 */
export function ProgressBar({
  value,
  max = 100,
  height = 'md',
  color = 'primary',
  showValue = false,
  valueInside = false,
  animated = false,
  pulse = false,
  label,
  className = '',
  ...props
}: ProgressBarProps) {
  // Normalizar o valor para porcentagem
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
  
  // Mapeamento de alturas para classes
  const heightClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  // Mapeamento de cores para classes
  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  };
  
  // Mapeamento de gradientes para classes
  const gradientClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-secondary-500',
    secondary: 'bg-gradient-to-r from-secondary-500 to-primary-500',
    success: 'bg-gradient-to-r from-green-500 to-green-400',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
    danger: 'bg-gradient-to-r from-red-500 to-red-400',
    info: 'bg-gradient-to-r from-blue-500 to-blue-400'
  };
  
  // Classe para a barra de fundo
  const backgroundClass = 'bg-gray-100 rounded-full overflow-hidden';
  
  // Classe para a barra de progresso
  const progressClass = [
    animated ? gradientClasses[color] : colorClasses[color],
    'transition-all duration-300 ease-out',
    animated ? 'animated-gradient' : '',
    pulse ? 'animate-pulse-slow' : '',
    heightClasses[height],
    'rounded-full'
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`w-full ${className}`}>
      {/* Label e valor */}
      {(label || (showValue && !valueInside)) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-700">{label}</span>}
          {showValue && !valueInside && (
            <span className="text-sm font-medium">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      
      {/* Barra de progresso */}
      <div className={`${backgroundClass} ${heightClasses[height]}`}>
        <div
          className={progressClass}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {showValue && valueInside && percentage >= 30 && (
            <span className="text-xs text-white px-2">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}