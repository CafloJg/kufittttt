import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { NetworkStatus as NetworkStatusUtil } from '../utils/network';

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showStatus, setShowStatus] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout>();
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const [wasOffline, setWasOffline] = useState(false);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const MAX_RETRIES = 5; // Increased from 3 to 5
  const RETRY_DELAY = 3000; // Increased from 2000 to 3000 ms
  const BACKOFF_FACTOR = 1.5; // Reduced from 2 to 1.5 for more gradual backoff
  const STATUS_DISPLAY_TIME = 5000; // 5 seconds

  // Use the NetworkStatus utility to get more accurate online status
  useEffect(() => {
    const networkStatus = NetworkStatusUtil.getInstance();
    
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

  useEffect(() => {
    const handleOnline = async () => {
      setIsReconnecting(true);
      setRetryCount(0);
      setShowStatus(true);
      try {
        // Add a small initial delay before enabling network to allow system to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Don't try to enable network - just update the UI state
        setIsOnline(true);
        console.log('Network connection restored');

        const timeout = setTimeout(() => setShowStatus(false), STATUS_DISPLAY_TIME);
        setHideTimeout(timeout);

        // Calculate offline duration
        if (lastOfflineTime) {
          const offlineDuration = new Date().getTime() - lastOfflineTime.getTime();
          console.log(`Reconnected after ${Math.round(offlineDuration / 1000)} seconds offline`);

          // If offline for more than 5 minutes, reload the page to refresh data
          if (offlineDuration > 5 * 60 * 1000) {
            console.log('Offline for more than 5 minutes, reloading page to refresh data');
            window.location.reload();
          }
        }

        setLastOfflineTime(null);
      } catch (error) {
        console.error('Error reconnecting:', error);
        if (retryCount < MAX_RETRIES) {
          const nextRetryCount = retryCount + 1;
          setRetryCount(nextRetryCount);
          const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, nextRetryCount - 1);
          const jitter = Math.random() * 2000; // Add jitter to prevent thundering herd
          const nextDelay = delay + jitter;
          console.log(`Reconnection attempt ${nextRetryCount} failed, retrying in ${Math.round(nextDelay/1000)}s...`);
          setTimeout(handleOnline, nextDelay);
        }
      } finally {
        setIsReconnecting(false);
      }
    };

    const handleOffline = () => {
      // Don't try to disable network - just update the UI state
      setLastOfflineTime(new Date());
      setIsOnline(false);
      setShowStatus(true);
      if (hideTimeout) {
        clearTimeout(hideTimeout); 
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check - with a small delay to ensure Firestore is initialized
    if (!navigator.onLine) {
      setTimeout(handleOffline, 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 animate-fade-in z-50 ${
      isOnline ? 'bg-green-500' : isReconnecting ? 'bg-yellow-500' : 'bg-red-500'
    } z-50`}>
      <div className="flex items-center gap-2 text-white font-medium whitespace-nowrap">
        {isReconnecting ? (
          <>
            <Loader2 size={18} className="animate-spin text-white" />
            <span>Reconectando...</span>
          </>
        ) : isOnline ? (
          <>
            <Wifi size={18} className="text-white" />
            <span>Conexão restaurada</span>
          </>
        ) : (
          <>
            <WifiOff size={18} className="text-white" />
            <span>Sem conexão</span>
          </>
        )}
      </div>
      
      {!isOnline && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-white opacity-80 mr-2">
            {isReconnecting 
              ? 'Tentando reconectar... Aguarde um momento.' 
              : 'Alterações serão sincronizadas quando voltar'}
          </div>
          <div>
            <button 
              onClick={() => window.location.reload()}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={16} className="text-white" />
              <span className="text-xs text-white">Recarregar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkStatus;