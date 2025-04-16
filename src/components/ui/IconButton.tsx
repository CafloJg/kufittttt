import React from 'react';
import { Loader2 } from 'lucide-react';

type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';
type IconButtonShape = 'square' | 'rounded' | 'circle';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Ícone do botão
   */
  icon: React.ReactNode;
  
  /**
   * Variante visual do botão
   * @default 'primary'
   */
  variant?: IconButtonVariant;
  
  /**
   * Tamanho do botão
   * @default 'md'
   */
  size?: IconButtonSize;
  
  /**
   * Forma do botão
   * @default 'rounded'
   */
  shape?: IconButtonShape;
  
  /**
   * Se o botão está em estado de carregamento
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Texto de acessibilidade para leitores de tela
   */
  ariaLabel?: string;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

/**
 * Componente de botão de ícone reutilizável
 */
export function IconButton({
  icon,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  isLoading = false,
  ariaLabel,
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  // Mapeamento de variantes para classes
  const variantClasses: Record<IconButtonVariant, string> = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  
  // Mapeamento de tamanhos para classes
  const sizeClasses: Record<IconButtonSize, string> = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };
  
  // Mapeamento de formas para classes
  const shapeClasses: Record<IconButtonShape, string> = {
    square: 'rounded-md',
    rounded: 'rounded-lg',
    circle: 'rounded-full'
  };
  
  // Classes base do botão
  const baseClasses = 'transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50';
  
  // Combinar todas as classes
  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses[shape],
    (disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
      ) : (
        icon
      )}
    </button>
  );
}