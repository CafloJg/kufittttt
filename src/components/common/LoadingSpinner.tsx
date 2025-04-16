import React from 'react';
import LoadingIndicator, { LoadingSize, LoadingColor } from '../ui/LoadingIndicator';

interface LoadingSpinnerProps {
  size?: LoadingSize;
  color?: string;
  text?: string;
  centered?: boolean;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md',
  color = 'primary-500',
  text,
  centered = false,
  fullScreen = false
}: LoadingSpinnerProps) {
  // Map size to LoadingIndicator size
  const mappedSize: LoadingSize = size || 'md';
  
  // Map color to LoadingIndicator color
  const mappedColor: LoadingColor = 
    color?.includes('primary') ? 'primary' : 
    color?.includes('secondary') ? 'secondary' : 
    color?.includes('white') ? 'white' : 'gray';
  
  return <LoadingIndicator 
    size={mappedSize} 
    color={mappedColor} 
    text={text}
    centered={centered}
    fullScreen={fullScreen}
    type="spinner"
  />;
}