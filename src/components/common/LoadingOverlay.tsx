import React from 'react';
import LoadingIndicator, { LoadingType } from '../ui/LoadingIndicator';

interface LoadingOverlayProps {
  message?: string;
  isTransparent?: boolean;
  type?: LoadingType;
}

export function LoadingOverlay({ 
  message = 'Carregando...', 
  isTransparent = false,
  type = 'pulse'
}: LoadingOverlayProps) {
  return (
    <LoadingIndicator
      size="lg"
      type={type}
      color={isTransparent ? 'white' : 'primary'}
      text={message}
      fullScreen={true}
      transparent={isTransparent}
      centered={true}
    />
  );
}