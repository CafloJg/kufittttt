import React from 'react';
import { Loader2 } from 'lucide-react';

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingType = 'spinner' | 'dots' | 'pulse';
export type LoadingColor = 'primary' | 'secondary' | 'white' | 'gray';

export interface LoadingIndicatorProps {
  /**
   * Size of the loading indicator
   * @default 'md'
   */
  size?: LoadingSize;
  
  /**
   * Type of loading indicator to display
   * @default 'spinner'
   */
  type?: LoadingType;
  
  /**
   * Color theme of the loading indicator
   * @default 'primary'
   */
  color?: LoadingColor;
  
  /**
   * Optional text to display alongside the loading indicator
   */
  text?: string;
  
  /**
   * Whether to center the loading indicator in its container
   * @default false
   */
  centered?: boolean;
  
  /**
   * Whether to show a full-screen overlay
   * @default false
   */
  fullScreen?: boolean;
  
  /**
   * Whether to make the background transparent
   * @default false
   */
  transparent?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Mapeamentos para tamanhos, cores e posições
const SIZE_MAPPINGS: Record<LoadingSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const COLOR_MAPPINGS: Record<LoadingColor, string> = {
  primary: 'text-primary-500',
  secondary: 'text-secondary-500',
  white: 'text-white',
  gray: 'text-gray-400'
};

/**
 * Reusable loading indicator component with multiple variants
 */
export function LoadingIndicator({
  size = 'md',
  type = 'spinner',
  color = 'primary',
  text,
  centered = false,
  fullScreen = false,
  transparent = false,
  className = ''
}: LoadingIndicatorProps) {
  // Container classes
  const containerClasses = [
    fullScreen ? 'fixed inset-0 z-50 flex items-center justify-center' : 'flex items-center',
    centered && !fullScreen ? 'justify-center' : '',
    transparent ? 'bg-transparent' : fullScreen ? 'bg-white/80 backdrop-blur-sm' : '',
    className
  ].filter(Boolean).join(' ');
  
  // Render the appropriate loading indicator based on type
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className={`${SIZE_MAPPINGS[size]} border-4 ${COLOR_MAPPINGS[color]} border-t-transparent rounded-full animate-spin`} />
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`${COLOR_MAPPINGS[color]} rounded-full animate-bounce`} style={{ width: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10, height: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10 }} />
            <div className={`${COLOR_MAPPINGS[color]} rounded-full animate-bounce delay-300`} style={{ width: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10, height: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10 }} />
            <div className={`${COLOR_MAPPINGS[color]} rounded-full animate-bounce delay-700`} style={{ width: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10, height: size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10 }} />
          </div>
        );
      case 'pulse':
        return (
          <Loader2 className={`${SIZE_MAPPINGS[size]} ${COLOR_MAPPINGS[color]} animate-spin`} />
        );
      default:
        return (
          <div className={`${SIZE_MAPPINGS[size]} border-4 ${COLOR_MAPPINGS[color]} border-t-transparent rounded-full animate-spin`} />
        );
    }
  };
  
  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        {renderLoader()}
        {text && (
          <p className={`text-sm font-medium ${COLOR_MAPPINGS[color]}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}


export default LoadingIndicator