import { useState, useCallback } from 'react';
import { useOffline } from '../context/OfflineContext';

export interface OfflineActionOptions<T, R> {
  // Função a ser executada quando online
  onlineAction: (data: T) => Promise<R>;
  // Função para executar ações locais quando offline
  offlineAction?: (data: T) => Promise<R | null>;
  // Tipo da ação para sincronização posterior
  actionType: string;
  // Função para validar dados antes de executar a ação
  validate?: (data: T) => boolean;
  // Se deve forçar a execução da ação online mesmo se offline
  forceOnline?: boolean;
  // Se deve mostrar mensagens de erro
  showErrors?: boolean;
  // Função para transformar os dados antes de salvar para sincronização
  transformForSync?: (data: T) => any;
}

export type OfflineActionResult<R> = {
  execute: (data: any) => Promise<R | null>;
  isExecuting: boolean;
  wasExecutedOffline: boolean;
  clearOfflineState: () => void;
};

/**
 * Hook para executar ações com suporte a modo offline
 */
export function useOfflineAction<T, R>(
  options: OfflineActionOptions<T, R>
): OfflineActionResult<R> {
  const {
    onlineAction,
    offlineAction,
    actionType,
    validate = () => true,
    forceOnline = false,
    showErrors = true,
    transformForSync = (data) => data
  } = options;

  const { isOnline, addPendingSync } = useOffline();
  const [isExecuting, setIsExecuting] = useState(false);
  const [wasExecutedOffline, setWasExecutedOffline] = useState(false);

  const execute = useCallback(
    async (data: T): Promise<R | null> => {
      // Validar dados antes de executar
      if (!validate(data)) {
        if (showErrors) {
          console.error('[useOfflineAction] Dados inválidos para ação:', actionType);
        }
        return null;
      }

      setIsExecuting(true);
      setWasExecutedOffline(false);

      try {
        // Se online ou a ação deve ser forçada online
        if (isOnline || forceOnline) {
          const result = await onlineAction(data);
          setIsExecuting(false);
          return result;
        }
        
        // Se offline e temos uma ação offline
        if (offlineAction) {
          const offlineResult = await offlineAction(data);
          
          // Adicionar para sincronização posterior
          addPendingSync(actionType, transformForSync(data));
          
          setWasExecutedOffline(true);
          setIsExecuting(false);
          return offlineResult;
        }
        
        // Se offline e não temos ação offline, apenas adicionar para sincronização
        addPendingSync(actionType, transformForSync(data));
        setWasExecutedOffline(true);
        setIsExecuting(false);
        
        if (showErrors) {
          console.warn(
            `[useOfflineAction] Ação "${actionType}" será sincronizada quando online`
          );
        }
        
        return null;
      } catch (error) {
        setIsExecuting(false);
        
        if (showErrors) {
          console.error(`[useOfflineAction] Erro ao executar ação "${actionType}":`, error);
        }
        
        // Se ocorrer erro online, podemos tentar salvar para sincronização posterior
        if (isOnline && !forceOnline) {
          addPendingSync(actionType, transformForSync(data));
          setWasExecutedOffline(true);
          
          if (showErrors) {
            console.warn(
              `[useOfflineAction] Ação "${actionType}" será tentada novamente mais tarde`
            );
          }
        }
        
        return null;
      }
    },
    [
      isOnline,
      onlineAction,
      offlineAction,
      actionType,
      addPendingSync,
      validate,
      forceOnline,
      showErrors,
      transformForSync
    ]
  );

  const clearOfflineState = useCallback(() => {
    setWasExecutedOffline(false);
  }, []);

  return {
    execute,
    isExecuting,
    wasExecutedOffline,
    clearOfflineState
  };
} 