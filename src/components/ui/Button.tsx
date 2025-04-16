import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Conteúdo do botão
   */
  children: React.ReactNode;
  
  /**
   * Variante visual do botão
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /**
   * Tamanho do botão
   * @default 'md'
   */
  size?: ButtonSize;
  
  /**
   * Ícone para exibir antes do texto
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Ícone para exibir depois do texto
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Se o botão deve ocupar toda a largura disponível
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Se o botão está em estado de carregamento
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Texto a ser exibido durante o carregamento
   */
  loadingText?: string;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

/**
 * Componente de botão reutilizável com várias variantes e estados
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  isLoading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Mapeamento de variantes para classes
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-lg hover:-translate-y-0.5',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    link: 'bg-transparent text-primary-500 hover:underline p-0 h-auto',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  
  // Mapeamento de tamanhos para classes
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-1.5 rounded-lg',
    md: 'px-4 py-2 rounded-xl',
    lg: 'text-lg px-6 py-3 rounded-xl',
    xl: 'text-xl px-8 py-4 rounded-xl font-semibold'
  };
  
  // Classes base do botão
  const baseClasses = 'font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50';
  
  // Combinar todas as classes
  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    (disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}