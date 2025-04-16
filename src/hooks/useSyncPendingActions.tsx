import { useState, useEffect, useCallback } from 'react';
import { useOffline } from '../context/OfflineContext';

interface SyncOptions {
  // Intervalo para tentar sincronização em milissegundos
  syncInterval?: number;
  // Função para lidar com cada tipo de ação
  syncHandlers: Record<string, (items: any[]) => Promise<string[]>>;
  // Função chamada quando itens são sincronizados
  onSyncComplete?: (type: string, successIds: string[], failedItems: any[]) => void;
  // Se deve iniciar a sincronização automaticamente
  autoStart?: boolean;
  // Número máximo de tentativas por item
  maxRetries?: number;
}

export type SyncResult = {
  isRunning: boolean;
  lastSyncTime: Date | null;
  pendingCount: number;
  startSync: () => Promise<boolean>;
  stopSync: () => void;
};

/**
 * Hook para sincronizar ações pendentes quando o usuário voltar a ficar online
 */
export function useSyncPendingActions(options: SyncOptions): SyncResult {
  const {
    syncInterval = 60000, // 1 minuto
    syncHandlers,
    onSyncComplete,
    autoStart = true,
    maxRetries = 3
  } = options;

  const { isOnline, getSyncPendingItems, clearPendingSync } = useOffline();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [syncIntervalId, setSyncIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Conta o número total de itens pendentes
  const countPendingItems = useCallback(() => {
    const items = getSyncPendingItems();
    let total = 0;
    
    Object.values(items).forEach(itemList => {
      total += itemList.length;
    });
    
    setPendingCount(total);
    return total;
  }, [getSyncPendingItems]);

  // Processa um tipo específico de itens pendentes
  const processPendingItems = useCallback(
    async (type: string, items: any[]): Promise<boolean> => {
      if (!syncHandlers[type] || items.length === 0) {
        return false;
      }

      try {
        console.log(`[useSyncPendingActions] Sincronizando ${items.length} itens do tipo ${type}`);
        
        // Executa o handler e recebe os IDs de itens que foram sincronizados com sucesso
        const successIds = await syncHandlers[type](items);
        
        // Identifica itens que falharam na sincronização
        const failedItems = items.filter(item => !successIds.includes(item.id));
        
        // Remove itens sincronizados com sucesso da lista de pendentes
        if (successIds.length > 0) {
          clearPendingSync(type, successIds);
        }
        
        // Incrementa a contagem de tentativas para itens que falharam
        if (failedItems.length > 0) {
          const pendingItems = getSyncPendingItems();
          const updatedFailedItems = failedItems.map(item => ({
            ...item,
            _retryCount: (item._retryCount || 0) + 1
          }));
          
          // Remove itens que excederam o número máximo de tentativas
          const itemsToKeep = updatedFailedItems.filter(item => (item._retryCount || 0) < maxRetries);
          const itemsToRemove = updatedFailedItems.filter(item => (item._retryCount || 0) >= maxRetries);
          
          if (itemsToRemove.length > 0) {
            console.warn(
              `[useSyncPendingActions] ${itemsToRemove.length} itens do tipo ${type} excederam o número máximo de tentativas e foram removidos`
            );
            
            // Remove esses itens da lista
            clearPendingSync(type, itemsToRemove.map(item => item.id));
          }
          
          // Callback quando a sincronização é concluída
          if (onSyncComplete) {
            onSyncComplete(type, successIds, failedItems);
          }
        } else if (onSyncComplete) {
          onSyncComplete(type, successIds, []);
        }
        
        return successIds.length > 0;
      } catch (error) {
        console.error(`[useSyncPendingActions] Erro ao sincronizar itens do tipo ${type}:`, error);
        return false;
      }
    },
    [syncHandlers, clearPendingSync, getSyncPendingItems, maxRetries, onSyncComplete]
  );

  // Executa a sincronização de todos os itens pendentes
  const runSync = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      console.warn('[useSyncPendingActions] Tentativa de sincronização enquanto offline');
      return false;
    }

    setIsRunning(true);
    const pendingItems = getSyncPendingItems();
    const types = Object.keys(pendingItems);
    
    if (types.length === 0) {
      setIsRunning(false);
      setLastSyncTime(new Date());
      return false;
    }

    let syncPerformed = false;
    
    // Processa cada tipo de item pendente
    for (const type of types) {
      if (syncHandlers[type]) {
        const result = await processPendingItems(type, pendingItems[type]);
        syncPerformed = syncPerformed || result;
      } else {
        console.warn(`[useSyncPendingActions] Nenhum handler definido para o tipo ${type}`);
      }
    }
    
    setLastSyncTime(new Date());
    setIsRunning(false);
    countPendingItems();
    
    return syncPerformed;
  }, [isOnline, getSyncPendingItems, processPendingItems, syncHandlers, countPendingItems]);

  // Inicia o processo de sincronização
  const startSync = useCallback(async (): Promise<boolean> => {
    // Se já estiver executando, apenas retorne
    if (isRunning) {
      return false;
    }
    
    // Executa a sincronização imediatamente
    const result = await runSync();
    
    // Configura o intervalo de verificação periódica
    if (!syncIntervalId) {
      const intervalId = setInterval(() => {
        if (isOnline && !isRunning) {
          runSync();
        }
      }, syncInterval);
      
      setSyncIntervalId(intervalId);
    }
    
    return result;
  }, [isRunning, runSync, syncIntervalId, syncInterval, isOnline]);

  // Para o processo de sincronização
  const stopSync = useCallback(() => {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      setSyncIntervalId(null);
    }
  }, [syncIntervalId]);

  // Inicia automaticamente se configurado
  useEffect(() => {
    // Contar itens pendentes ao iniciar
    countPendingItems();
    
    if (autoStart && isOnline) {
      startSync();
    }
    
    return () => {
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
      }
    };
  }, [autoStart, isOnline, startSync, syncIntervalId, countPendingItems]);

  // Reconta o número de itens pendentes quando o status online muda
  useEffect(() => {
    countPendingItems();
  }, [isOnline, countPendingItems]);

  // Inicia a sincronização quando voltar a ficar online
  useEffect(() => {
    if (isOnline && !isRunning && pendingCount > 0 && autoStart) {
      startSync();
    }
  }, [isOnline, pendingCount, startSync, isRunning, autoStart]);

  return {
    isRunning,
    lastSyncTime,
    pendingCount,
    startSync,
    stopSync
  };
} 