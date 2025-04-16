import React from 'react';

interface CardProps {
  /**
   * Conteúdo do card
   */
  children: React.ReactNode;
  
  /**
   * Título do card
   */
  title?: React.ReactNode;
  
  /**
   * Descrição do card
   */
  description?: React.ReactNode;
  
  /**
   * Ações do card (botões, links, etc.)
   */
  actions?: React.ReactNode;
  
  /**
   * Ícone do card
   */
  icon?: React.ReactNode;
  
  /**
   * Se o card deve ter efeito de hover
   * @default true
   */
  hoverable?: boolean;
  
  /**
   * Se o card deve ter bordas arredondadas
   * @default true
   */
  rounded?: boolean;
  
  /**
   * Se o card deve ter sombra
   * @default true
   */
  shadow?: boolean;
  
  /**
   * Se o card deve ter padding
   * @default true
   */
  padding?: boolean;
  
  /**
   * Se o card deve ter efeito de vidro (glassmorphism)
   * @default false
   */
  glass?: boolean;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
  
  /**
   * Evento de clique
   */
  onClick?: () => void;
}

/**
 * Componente de card reutilizável
 */
export function Card({
  children,
  title,
  description,
  actions,
  icon,
  hoverable = true,
  rounded = true,
  shadow = true,
  padding = true,
  glass = false,
  className = '',
  onClick,
  ...props
}: CardProps) {
  // Classes base do card
  const baseClasses = [
    'relative overflow-hidden',
    rounded ? 'rounded-2xl' : '',
    shadow ? 'shadow-sm' : '',
    padding ? 'p-6' : '',
    glass ? 'glass-morphism' : 'bg-white',
    hoverable ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-md' : '',
    onClick ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={baseClasses} onClick={onClick} {...props}>
      {/* Cabeçalho do card */}
      {(title || icon) && (
        <div className="flex items-center gap-4 mb-4">
          {icon && (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-50 text-primary-500">
              {icon}
            </div>
          )}
          <div>
            {title && (
              typeof title === 'string' 
                ? <h3 className="font-semibold text-lg">{title}</h3>
                : title
            )}
            {description && (
              typeof description === 'string'
                ? <p className="text-sm text-gray-500">{description}</p>
                : description
            )}
          </div>
        </div>
      )}
      
      {/* Conteúdo do card */}
      <div className="space-y-4">
        {children}
      </div>
      
      {/* Ações do card */}
      {actions && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}