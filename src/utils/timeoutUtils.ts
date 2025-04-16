/**
 * Utilitários para gerenciar timeouts em operações assíncronas
 */

/**
 * Executa uma promessa com um timeout definido
 * @param promise A promessa a ser executada
 * @param ms Tempo limite em milissegundos
 * @param signal Sinal de aborto opcional para cancelamento externo
 * @returns Resultado da promessa
 * @throws Erro se o tempo limite for atingido ou a operação for cancelada
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  ms: number, 
  signal?: AbortSignal
): Promise<T> {
  // Criamos um novo controlador para este timeout
  const controller = new AbortController();
  
  // Configuramos o timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn(`Operação excedeu o tempo limite de ${ms/1000} segundos`);
  }, ms);
  
  // Lidamos com signal externo se fornecido
  if (signal) {
    // Verificar se já foi abortado
    if (signal.aborted) {
      clearTimeout(timeoutId);
      return Promise.reject(new Error('Operação cancelada pelo usuário'));
    }
    
    // Configurar listener para abortar quando o signal externo abortar
    const abortHandler = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    
    signal.addEventListener('abort', abortHandler);
    
    // Limpar listener quando o nosso controlador abortar
    controller.signal.addEventListener('abort', () => {
      try {
        signal.removeEventListener('abort', abortHandler);
      } catch (err) {
        // Ignorar erros ao remover o listener
      }
    });
  }
  
  // Corremos a promessa e o timeout em uma corrida
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        if (signal?.aborted) {
          reject(new Error('Operação cancelada pelo usuário'));
        } else {
          reject(new Error('Operação excedeu o tempo limite'));
        }
      });
    })
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Função auxiliar para criar uma promessa que pode ser resolvida/rejeitada externamente
 */
export function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

/**
 * Função para tentar uma operação várias vezes com backoff exponencial
 * @param operation Função que retorna uma promessa para a operação a ser tentada
 * @param options Opções de configuração
 */
export async function withRetry<T>(
  operation: () => Promise<T>, 
  options: {
    maxRetries?: number,
    initialDelay?: number,
    backoffFactor?: number,
    maxDelay?: number,
    shouldRetry?: (error: any, attempt: number) => boolean,
    onRetry?: (error: any, attempt: number, delay: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Se estamos na última tentativa ou não devemos tentar novamente, falhar
      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calcular atraso com backoff exponencial
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
      
      // Notificar sobre a nova tentativa
      onRetry(error, attempt + 1, delay);
      
      // Esperar pelo atraso antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Nunca deve chegar aqui, mas para satisfazer o TypeScript
  throw lastError;
} 