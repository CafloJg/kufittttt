import type { Message } from '../types/chat';
import type { UserProfile } from '../types/user';
import type { FoodAnalysis } from '../types/food';
import { getOpenAIKey } from '../utils/apiKeys';

// Cache configuration
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days - increased cache duration
const promptCache = new Map<string, { result: any; timestamp: number }>();

// API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1';
const ALLOWED_MODEL = 'gpt-3.5-turbo';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const TIMEOUT = 480000; // 8 minute timeout (increased from 6 minutes)
const BACKOFF_FACTOR = 1.5;
const MAX_JITTER = 2000; // Maximum jitter in milliseconds
const MAX_CONSECUTIVE_FAILURES = 3;
const NETWORK_ERRORS = [
  'failed to fetch',
  'network error', 
  'connection',
  'internet',
  'timeout',
  'socket hang up',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT'
];

// Circuit breaker state
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;
let consecutiveFailures = 0;
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;
const requestQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  options: any;
  url: string;
  priority?: number; // Added priority for request queue
}> = [];
let isProcessingQueue = false;

/**
 * Fetch with retry and timeout handling
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit & { body?: any }, 
  retries = MAX_RETRIES,
  attempt = 0
): Promise<Response> {
  try {
    // Check circuit breaker
    if (circuitBreakerOpen) {
      if (Date.now() < circuitBreakerResetTime) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
      } else {
        // Reset circuit breaker
        circuitBreakerOpen = false;
        consecutiveFailures = 0;
      }
    }

    // Log request start time
    const startTime = Date.now();
    console.log(`API request started: ${url}`, { timestamp: new Date().toISOString() });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    // Get validated API key
    const apiKey = await getOpenAIKey();

    // Generate cache key from body if available
    let cacheKey = '';
    if (options.body) {
      try {
        cacheKey = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
          
        // Check cache first
        const cached = promptCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached response');
          clearTimeout(timeoutId);
          return new Response(JSON.stringify(cached.result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (cacheError) {
        console.warn('Failed to generate cache key:', cacheError);
        // Continue without caching
      }
    }

    // Prepare body as string if it's an object
    const body = typeof options.body === 'string' 
      ? options.body 
      : options.body ? JSON.stringify(options.body) : undefined;

    // Make the request
    const response = await fetch(url, {
      ...options,
      body,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        ...options.headers
      },
      signal: controller.signal,
      keepalive: true
    });

    clearTimeout(timeoutId);
    
    // Log request end time and duration
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`API request completed: ${url}`, { 
      duration: `${duration}ms`,
      status: response.status,
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      let errorMessage = 'Erro desconhecido';
      
      // Handle specific error status codes
      if (response.status === 401) {
        throw new Error('Chave da API OpenAI inválida ou expirada.\n\nVerifique se a chave está correta ou obtenha uma nova em:\nhttps://platform.openai.com/account/api-keys');
      }

      if (response.status === 403) {
        throw new Error('Acesso negado ao modelo GPT-4.\n\nVerifique se sua chave tem acesso ao GPT-4 em:\nhttps://platform.openai.com/account/api-keys');
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        if (retries > 0) {
          console.warn(`Rate limit hit, waiting ${retryAfter}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return fetchWithRetry(url, options, retries - 1);
        }
        throw new Error('Muitas solicitações. Por favor, aguarde alguns minutos e tente novamente.');
      }

      try {
        const error = await response.json();
        errorMessage = error.error?.message || `Erro ${response.status}: ${response.statusText}`;
      } catch (jsonError) {
        console.error('Failed to parse error response:', jsonError);
        errorMessage = `Erro ${response.status}: ${response.statusText}`;
      }
      
      const msg = errorMessage.toLowerCase();
      if (msg.includes('api key') || msg.includes('invalid') || msg.includes('incorrect')) {
        throw new Error('Chave da API OpenAI inválida. Verifique se a chave está correta no arquivo .env ou obtenha uma nova em https://platform.openai.com/account/api-keys');
      }

      // Other errors should retry
      if (retries > 0) {
        const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, MAX_RETRIES - retries);
        const jitter = Math.random() * MAX_JITTER;
        const totalDelay = delay + jitter;
        console.warn(`Request failed (${response.status}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return fetchWithRetry(url, options, retries - 1, attempt + 1);
      }

      throw new Error(errorMessage);
    }

    // Cache successful responses
    if (cacheKey) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        promptCache.set(cacheKey, {
          result: data,
          timestamp: Date.now()
        });
      } catch (cacheError) {
        console.warn('Failed to cache response:', cacheError);
        // Continue without caching
      }
    }

    return response;
  } catch (error) {
    // Handle network errors with retry
    consecutiveFailures++;
    
    // Check if we should open the circuit breaker
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      circuitBreakerOpen = true;
      circuitBreakerResetTime = Date.now() + 60000; // 1 minute
      console.warn('Circuit breaker opened due to consecutive failures');
    }
    
    if (retries > 0 && error instanceof Error) {
      const isNetworkError = error.name === 'TypeError' && error.message === 'Failed to fetch';
      const isTimeout = error.name === 'AbortError';
      const isConnectionError = error.message.toLowerCase().includes('network') ||
                              error.message.toLowerCase().includes('connection') ||
                              error.message.toLowerCase().includes('internet');

      if (isNetworkError || isTimeout || isConnectionError) {
        const attempt = MAX_RETRIES - retries + 1;
        const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, attempt - 1);
        const jitter = Math.floor(Math.random() * MAX_JITTER);
        const totalDelay = delay + jitter;
        
        console.warn(`Network error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${totalDelay}ms...`, {
          error: error.message,
          attempt,
          delay: totalDelay
        });
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return fetchWithRetry(url, options, retries - 1);
      }
    }

    // Log detailed error information
    console.error('API request failed:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      url,
      retries
    });

    // Re-throw the error with better messages for common errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (error.name === 'AbortError') {
        throw new Error('A requisição excedeu o tempo limite. Por favor, tente novamente.');
      }
      
      if (errorMessage.includes('api key') || errorMessage.includes('apikey')) {
        throw new Error('Chave da API OpenAI inválida ou não configurada. Verifique o arquivo .env');
      }
      
      if (errorMessage.includes('failed to fetch') || errorMessage.includes('network error') || errorMessage.includes('connection')) {
        throw new Error('Erro de conexão. Verifique sua internet e aguarde alguns segundos antes de tentar novamente.');
      }
    }

    throw error;
  }
}

/**
 * Process the request queue
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
      const request = requestQueue.shift();
      if (!request) continue;
      
      activeRequests++;
      
      try {
        const response = await fetchWithRetry(request.url, request.options);
        request.resolve(response);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeRequests--;
      }
      
      // Add a small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    isProcessingQueue = false;
    
    // If there are more requests in the queue and we have capacity, process them
    if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
      setTimeout(processQueue, 100);
    }
  }
}

/**
 * Queue a request and process it when capacity is available
 */
async function queueRequest(url: string, options: RequestInit & { body?: any }): Promise<Response> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, options, resolve, reject });
    
    // Start processing the queue if it's not already being processed
    if (!isProcessingQueue && activeRequests < MAX_CONCURRENT_REQUESTS) {
      processQueue();
    }
  });
}

/**
 * Get response from OpenAI chat completion
 */
async function getChatResponse(messages: Message[], userProfile: UserProfile): Promise<string> {
  try {
    console.log('Starting chat completion request with model:', ALLOWED_MODEL);
    
    const response = await queueRequest(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      body: {
        model: ALLOWED_MODEL,
        messages: [
          {
            role: 'system',
            content: `Você é a Dra. Helena, uma nutricionista experiente e carismática.

PERSONALIDADE:
- Profissional mas acolhedora
- Empática e motivadora
- Usa linguagem clara e acessível
- Foca em orientações práticas
- Demonstra conhecimento técnico
- Mantém um tom positivo e encorajador

REGRAS DE COMUNICAÇÃO:
1. SEMPRE responda em português do Brasil
2. Use linguagem natural e profissional
3. Evite respostas muito longas ou técnicas demais
4. NUNCA se refira a si mesma como IA ou assistente
5. Mantenha o papel de nutricionista profissional
6. Use emojis com moderação para tornar a conversa mais amigável
7. Personalize as respostas com base no perfil e objetivos do paciente
8. Ofereça dicas práticas e realistas
9. Demonstre empatia com as dificuldades do paciente
10. Celebre pequenas conquistas

EXEMPLOS DE RESPOSTAS:
- "Entendo sua preocupação! Vamos ajustar sua alimentação para..."
- "Que ótimo que você está se dedicando! Continue assim 💪"
- "Uma dica que sempre funciona é..."
- "Baseado no seu objetivo de [objetivo], sugiro..."

IMPORTANTE:
- Mantenha um equilíbrio entre profissionalismo e acolhimento
- Adapte o tom baseado no contexto da conversa
- Ofereça suporte e motivação
- Foque em orientações práticas e alcançáveis
- Não retorne JSON a menos que explicitamente solicitado
- Responda como uma nutricionista real responderia`
          },
          {
            role: 'user',
            content: `
PERFIL DO PACIENTE:
👤 Nome: ${userProfile.name || 'Paciente'}
🥗 Dieta: ${userProfile.dietType || 'Não especificada'}
🎯 Objetivo: ${userProfile.goals?.type === 'loss' ? 'Emagrecimento' : userProfile.goals?.type === 'gain' ? 'Ganho de massa' : 'Manutenção'}
⚖️ Peso atual: ${userProfile.weight ? `${userProfile.weight}kg` : 'Não especificado'}
🎯 Meta de peso: ${userProfile.goals?.targetWeight ? `${userProfile.goals.targetWeight}kg` : 'Não especificado'}
⚠️ Alergias: ${userProfile.allergies?.join(', ') || 'Nenhuma'}
❌ Restrições: ${userProfile.dislikedIngredients?.join(', ') || 'Nenhuma'}
💪 Nível de atividade: ${userProfile.goals?.activityLevel || 'Não especificado'}
✨ Progresso: ${userProfile.checkInStreak ? `${userProfile.checkInStreak} dias de check-in` : 'Iniciando jornada'}

MENSAGEM: ${messages[messages.length - 1].text}

HISTÓRICO DE MENSAGENS:
${messages.slice(-3).map(m => `${m.isBot ? 'Dra. Helena' : 'Paciente'}: ${m.text}`).join('\n')}
`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        top_p: 1
      }
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Resposta inválida do assistente');
    }
    
    return content;
  } catch (error) {
    console.error('Error getting chat response:', error);
    
    if (error instanceof Error) {
      // Check for known error messages
      const errorLower = error.message.toLowerCase();
      
      if (errorLower.includes('model_not_found') || errorLower.includes('does not have access to model')) {
        throw new Error('Serviço temporariamente indisponível. Por favor, tente novamente mais tarde.');
      }
      
      if (errorLower.includes('capacity')) {
        throw new Error('Serviço sobrecarregado. Tente novamente em alguns minutos.');
      }
      
      if (errorLower.includes('invalid_api_key') || errorLower.includes('api key') || errorLower.includes('apikey')) {
        throw new Error('Chave da API OpenAI inválida ou não configurada. Verifique o arquivo .env');
      }
      
      if (errorLower.includes('insufficient_quota') || errorLower.includes('billing')) {
        throw new Error('Sua cota da API OpenAI foi excedida. Verifique seu uso no dashboard da OpenAI.');
      }
      
      if (errorLower.includes('rate_limit') || errorLower.includes('muitas solicitações')) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        throw new Error(`Muitas solicitações. Aguarde ${waitTime} segundos antes de tentar novamente.`);
      }
      
      if (errorLower.includes('context_length_exceeded')) {
        throw new Error('Prompt muito longo. Tente reduzir as preferências alimentares.');
      }
      
      // If it's a known error, rethrow it
      if (errorLower.includes('erro ao processar') || 
          errorLower.includes('não foi possível') ||
          errorLower.includes('temporariamente') ||
          errorLower.includes('verifique')) {
        throw error;
      }
    }
    
    // Default error message
    throw new Error('Não foi possível processar sua mensagem. Por favor, tente novamente.');
  }
}

/**
 * Analyze food image with OpenAI Vision API
 */
async function analyzeImageWithOpenAI(imageData: string): Promise<FoodAnalysis> {
  try {
    // Validate image format
    const [header, base64Content] = imageData.split(',');
    if (!header || !base64Content || !header.startsWith('data:image/')) {
      throw new Error('Formato de imagem inválido. Use uma foto no formato JPG ou PNG.');
    }
    
    const mimeType = header.split(':')[1].split(';')[0];
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      throw new Error('Formato não suportado. Use apenas fotos JPG ou PNG.');
    }
    
    // Validate image size
    const imageSize = (base64Content.length * 3) / 4;
    if (imageSize > 4 * 1024 * 1024) {
      throw new Error(`Imagem muito grande (${Math.round(imageSize/1024/1024)}MB). Use uma foto menor que 4MB.`);
    }
    
    if (imageSize < 1024) {
      throw new Error('Imagem muito pequena. Tente tirar uma foto mais nítida.');
    }

    // Make API request
    const response = await queueRequest(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      body: {
        model: ALLOWED_MODEL,
        messages: [
          { 
            role: 'system',
            content: `Você é um nutricionista profissional brasileiro. Retorne APENAS um objeto JSON válido com refeições seguindo o formato especificado. Todos os nomes de alimentos e refeições DEVEM estar em português do Brasil. Não inclua texto adicional ou formatação.`
          },
          {
            role: 'user',
            content: [
              { type: "text", text: "Analise esta imagem de alimento:" },
              { type: "image_url", url: imageData },
              { type: "text", text: "Identifique os alimentos visíveis e seus métodos de preparo." }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }
    });

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Não foi possível analisar a imagem. Tente novamente.');
    }
      
      // Clean and parse response content
      const content = data.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Resposta inválida: JSON não encontrado');
      }
      
      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Erro ao converter resposta para JSON:', {
          error: parseError,
          content: content
        });
        throw new Error('Erro ao processar a resposta. Tente novamente.');
      }

    // Validate result format
    if (!result.ingredients || !Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      console.warn('No food detected:', result);
      throw new Error('Nenhum alimento identificado. Tente uma foto mais clara ou de outro ângulo.');
    }
    
    if (!result.confidence || typeof result.confidence !== 'number') {
      result.confidence = 0.7; // Default confidence if missing
    }
    
    if (result.confidence < 0.7) {
      throw new Error('Não foi possível identificar os alimentos com certeza. Tente uma foto mais nítida.');
    }

    // Create and return analysis object
    const analysis: FoodAnalysis = {
      ingredients: result.ingredients,
      timestamp: new Date().toISOString(),
      imageUrl: imageData,
      confidence: result.confidence,
      preparation: result.preparation || []
    };

    return analysis;
  } catch (error) {
    console.error('OpenAI image analysis error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof Error) {
      // Preserve specific error messages about image format or content
      const errorLower = error.message.toLowerCase();
      
      if (errorLower.includes('formato') || 
          errorLower.includes('muito grande') || 
          errorLower.includes('muito pequena') || 
          errorLower.includes('nenhum alimento') || 
          errorLower.includes('não foi possível identificar')) {
        throw error;
      }
      
      // Provide more specific messages for common errors
      if (errorLower.includes('failed to fetch') || 
          errorLower.includes('network error') || 
          errorLower.includes('connection')) {
        throw new Error('Erro de conexão. Verifique sua internet e aguarde alguns segundos antes de tentar novamente.');
      }
      
      if (errorLower.includes('timeout') || errorLower.includes('tempo limite')) {
        throw new Error('O serviço está demorando para responder. Por favor, aguarde alguns segundos e tente novamente.');
      }
      
      if (errorLower.includes('api key')) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      }
      
      if (errorLower.includes('rate limit') || errorLower.includes('muitas solicitações')) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        throw new Error(`Muitas solicitações. Aguarde ${waitTime} segundos antes de tentar novamente.`);
      }
    }
    
    // Default error message
    throw new Error('Erro ao processar solicitação. Por favor, aguarde alguns segundos e tente novamente.');
  }
}

// Export functions
export { getChatResponse, analyzeImageWithOpenAI };