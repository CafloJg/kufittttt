import { useState, useEffect, useCallback } from 'react';
import { NetworkStatus } from '../utils/network';

/**
 * Hook para monitorar o status da conexão de rede
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  
  // Função para reconectar manualmente
  const reconnect = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const networkStatus = NetworkStatus.getInstance();
    
    const handleStatusChange = (online: boolean) => {
      // Se estava offline e agora está online
      if (!isOnline && online) {
        setWasOffline(true);
        
        // Calcular duração offline
        if (offlineSince) {
          const duration = new Date().getTime() - offlineSince.getTime();
          setOfflineDuration(duration);
          
          // Se ficou offline por mais de 5 minutos, sugerir recarregar
          if (duration > 5 * 60 * 1000) {
            console.log('Offline por mais de 5 minutos, sugerindo recarregar');
          }
        }
        
        setOfflineSince(null);
      }
      
      // Se estava online e agora está offline
      if (isOnline && !online) {
        setOfflineSince(new Date());
      }
      
      setIsOnline(online);
    };
    
    // Configurar listeners
    const handleOnline = () => handleStatusChange(true);
    const handleOffline = () => handleStatusChange(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Inscrever-se no NetworkStatus
    const unsubscribe = networkStatus.addListener(handleStatusChange);
    
    // Limpar listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [isOnline, offlineSince]);

  return {
    isOnline,
    wasOffline,
    offlineDuration,
    offlineSince,
    reconnect
  };
}