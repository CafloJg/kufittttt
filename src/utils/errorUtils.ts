/**
 * Utilitários centralizados para tratamento de erros
 */

import { reportError as reportErrorToService } from './errorReporting';

// Categorias de erros comuns para facilitar a identificação
export const ERROR_CATEGORIES = {
  API_KEY: ['api key', 'openai', 'apikey'],
  RATE_LIMIT: ['rate limit', 'muitas solicitações', 'too many requests'],
  SERVER: ['503', '504', 'sobrecarregado', 'unavailable'],
  NETWORK: ['network', 'failed to fetch', 'connection', 'internet', 'offline'],
  TRANSACTION: ['transaction', 'firestore', 'database'],
  TIMEOUT: ['timeout', 'timed out', 'demorando'],
  VALIDATION: ['validation', 'invalid', 'required'],
  AUTH: ['auth', 'permission', 'unauthorized', 'unauthenticated'],
  ABORTED: ['aborted', 'canceled', 'cancelled', 'abort']
};

interface ErrorReportOptions {
  context?: string;
  userId?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Formata mensagens de erro para melhor experiência do usuário
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    // Skip Firestore internal assertion errors
    if (errorMessage.includes('internal assertion failed')) {
      return 'Erro interno do sistema. Por favor, tente novamente.';
    }

    // Verifica se o erro se encaixa em alguma categoria conhecida
    if (ERROR_CATEGORIES.API_KEY.some(term => errorMessage.includes(term))) {
      return 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
    }
    
    if (ERROR_CATEGORIES.RATE_LIMIT.some(term => errorMessage.includes(term))) {
      return 'Muitas solicitações. Aguarde alguns minutos.';
    }

    if (ERROR_CATEGORIES.SERVER.some(term => errorMessage.includes(term))) {
      return 'O serviço está sobrecarregado. Tente novamente em alguns minutos.';
    }
    
    if (ERROR_CATEGORIES.NETWORK.some(term => errorMessage.includes(term))) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    // Specific handling for Firestore offline errors
    if (errorMessage.includes('offline') || errorMessage.includes('client is offline')) {
      return 'Você está offline. Verifique sua conexão com a internet e tente novamente.';
    }

    if (ERROR_CATEGORIES.TRANSACTION.some(term => errorMessage.includes(term))) {
      return 'Erro ao salvar dados. Tente novamente.';
    }
    
    if (ERROR_CATEGORIES.TIMEOUT.some(term => errorMessage.includes(term))) {
      return 'O serviço está demorando para responder. Por favor, aguarde ou tente novamente mais tarde.';
    }

    // Validation errors
    if (errorMessage.includes('complete seu perfil')) {
      return 'Complete seu perfil antes de gerar um plano alimentar.';
    }

    if (errorMessage.includes('configure suas metas')) {
      return 'Configure suas metas antes de gerar um plano alimentar.';
    }

    if (errorMessage.includes('selecione um tipo de dieta')) {
      return 'Selecione um tipo de dieta no seu perfil.';
    }

    // Erros de operação abortada
    if (ERROR_CATEGORIES.ABORTED.some(term => errorMessage.includes(term))) {
      return 'Operação cancelada. Tente novamente quando desejar.';
    }
    
    return error.message;
  }
  
  return 'Erro desconhecido. Tente novamente.';
}

/**
 * Categoriza erros para tratamento específico
 */
export function categorizeError(error: Error | unknown): {
  type: 'network' | 'timeout' | 'auth' | 'validation' | 'api' | 'unknown';
  isCritical: boolean;
  retryable: boolean;
  message: string;
} {
  if (!(error instanceof Error)) {
    return { 
      type: 'unknown', 
      isCritical: false, 
      retryable: true, 
      message: String(error) 
    };
  }
  
  const message = error.message.toLowerCase();
  
  // Usa as categorias de erro para classificação
  if (ERROR_CATEGORIES.NETWORK.some(term => message.includes(term))) {
    return { 
      type: 'network', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  if (ERROR_CATEGORIES.TIMEOUT.some(term => message.includes(term))) {
    return { 
      type: 'timeout', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  if (ERROR_CATEGORIES.AUTH.some(term => message.includes(term))) {
    return { 
      type: 'auth', 
      isCritical: true, 
      retryable: false, 
      message: error.message 
    };
  }
  
  if (ERROR_CATEGORIES.VALIDATION.some(term => message.includes(term))) {
    return { 
      type: 'validation', 
      isCritical: false, 
      retryable: false, 
      message: error.message 
    };
  }
  
  if (ERROR_CATEGORIES.API_KEY.some(term => message.includes(term)) || 
      ERROR_CATEGORIES.SERVER.some(term => message.includes(term)) ||
      message.includes('status code')) {
    return { 
      type: 'api', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  return { 
    type: 'unknown', 
    isCritical: false, 
    retryable: true, 
    message: error.message 
  };
}

/**
 * Reporta erros para um serviço de monitoramento
 */
export function reportError(error: Error | unknown, options: ErrorReportOptions = {}) {
  return reportErrorToService(error, options);
}

/**
 * Executa uma operação com retry automático e backoff exponencial
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    onRetry,
    shouldRetry = (error) => {
      const { retryable } = categorizeError(error);
      return retryable;
    }
  } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (!shouldRetry(lastError) || attempt >= maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      attempt++;
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Executa uma operação assíncrona com tratamento de erro padronizado
 * @param operation Função que retorna uma Promise
 * @param options Opções de configuração
 * @returns Resultado da operação ou erro
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    context?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    severity?: 'info' | 'warning' | 'error';
    retry?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
  }
): Promise<T> {
  const { 
    context = 'operação', 
    onSuccess, 
    onError, 
    severity = 'error',
    retry = false,
    retryAttempts = 2,
    retryDelay = 1000
  } = options || {};

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= (retry ? retryAttempts : 0)) {
    try {
      // Executar a operação
      const result = await operation();
      
      // Callback de sucesso, se fornecido
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Retornar o resultado
      return result;
    } catch (err) {
      // Formatação do erro
      lastError = err instanceof Error 
        ? err 
        : new Error(typeof err === 'string' ? err : `Erro desconhecido na ${context}`);
      
      // Registrar o erro
      console.error(`Erro durante ${context} (tentativa ${attempts + 1}/${retry ? retryAttempts + 1 : 1}):`, lastError);
      
      // Reportar ao sistema de monitoramento, se necessário
      if (severity === 'error') {
        reportError(lastError, { context });
      }
      
      // Callback de erro, se fornecido
      if (onError) {
        onError(lastError);
      }
      
      // Incrementar tentativas
      attempts++;
      
      // Se não estamos na última tentativa, esperar antes de tentar novamente
      if (retry && attempts <= retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
      } else {
        // Se não estamos tentando novamente ou atingimos o limite, lançar erro
        throw lastError;
      }
    }
  }
  
  // Este ponto nunca deve ser alcançado devido ao loop acima
  throw lastError || new Error(`Erro não tratado em ${context}`);
}

/**
 * Reporta um erro para o sistema de monitoramento
 * (Stub - implemente conforme necessário)
 */
// function reportError(error: Error, metadata?: Record<string, any>): void {
//   // Aqui você pode integrar com sistemas como Sentry, LogRocket, etc.
//   console.warn('[Error Reporting]', error, metadata);
// }