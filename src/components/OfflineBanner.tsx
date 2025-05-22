import React from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

interface OfflineBannerProps {
  showWhenOnline?: boolean;
  showOfflineActions?: boolean;
  message?: string;
  className?: string;
}

/**
 * Componente que exibe um banner indicando o status de conexão
 */
export function OfflineBanner({
  showWhenOnline = false,
  showOfflineActions = true,
  message,
  className = ''
}: OfflineBannerProps) {
  const { isOnline, isChecking, checkConnection } = useOffline();
  
  // Se estiver online e não for para mostrar quando online, não exibir nada
  if (isOnline && !showWhenOnline) {
    return null;
  }
  
  // Status e mensagem padrão
  const statusMessage = isOnline
    ? 'Você está online.'
    : message || 'Você está offline. Algumas funcionalidades podem estar limitadas.';
  
  // Estilos baseados no status
  const baseStyle = 'py-2 px-4 rounded-lg flex items-center gap-3 text-sm m-2 shadow-sm';
  const offlineStyle = 'bg-orange-50 text-orange-700 border border-orange-100';
  const onlineStyle = 'bg-green-50 text-green-700 border border-green-100';
  
  const bannerStyle = `${baseStyle} ${isOnline ? onlineStyle : offlineStyle} ${className}`;
  
  return (
    <div className={bannerStyle} role="alert" aria-live="polite">
      {isOnline ? (
        <Wifi className="w-5 h-5" />
      ) : (
        <WifiOff className="w-5 h-5" />
      )}
      
      <span className="flex-1">{statusMessage}</span>
      
      {showOfflineActions && !isOnline && (
        <button
          onClick={() => checkConnection()}
          disabled={isChecking}
          className="flex items-center gap-1 py-1 px-2 rounded bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Verificar conexão"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span className="text-xs">Verificar</span>
        </button>
      )}
    </div>
  );
}

/**
 * Componente que exibe um indicador flutuante de status offline
 */
export function OfflineIndicator({ position = 'bottom-right' }: { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const { isOnline } = useOffline();
  
  // Se estiver online, não exibir nada
  if (isOnline) {
    return null;
  }
  
  // Definir classes de posição
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };
  
  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 bg-orange-500 text-white p-2 rounded-full shadow-lg`}
      title="Você está offline"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-5 h-5" />
    </div>
  );
} 