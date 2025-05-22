import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineAwareComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  dataRequirement?: () => boolean;
  showOfflineIndicator?: boolean;
}

/**
 * Componente para lidar com estado offline e mostrar conteúdo apropriado
 * @param children Conteúdo a ser renderizado quando online e dados disponíveis
 * @param fallback Conteúdo fallback para mostrar quando offline ou dados indisponíveis
 * @param dataRequirement Função que retorna true se os dados necessários estão disponíveis
 * @param showOfflineIndicator Se deve mostrar um indicador de offline
 */
export function OfflineAwareComponent({
  children,
  fallback,
  dataRequirement = () => true,
  showOfflineIndicator = true
}: OfflineAwareComponentProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataAvailable, setDataAvailable] = useState(dataRequirement());
  
  // Monitorar o estado de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Verificar periodicamente se os dados necessários estão disponíveis
  useEffect(() => {
    if (isOnline) {
      // Verificar imediatamente
      setDataAvailable(dataRequirement());
      
      // E depois a cada 5 segundos
      const interval = setInterval(() => {
        setDataAvailable(dataRequirement());
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isOnline, dataRequirement]);
  
  // Se estiver offline ou dados indisponíveis, mostrar fallback
  const shouldShowFallback = !isOnline || !dataAvailable;
  
  if (shouldShowFallback) {
    return (
      <div className="offline-wrapper">
        {!isOnline && showOfflineIndicator && (
          <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 mb-4 border border-orange-100">
            <WifiOff className="w-5 h-5" />
            <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
          </div>
        )}
        {fallback || (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-600">
              {!isOnline 
                ? 'Conteúdo indisponível offline. Conecte-se à internet e tente novamente.' 
                : 'Carregando dados...'}
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Componente que mostra conteúdo offline para uso em lista de itens
 */
export function OfflineItem({
  message = 'Item indisponível offline'
}: {
  message?: string;
}) {
  return (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 text-gray-500">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
} 