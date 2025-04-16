import { auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getOpenAIKey } from "../../utils/apiKeys";
import type { ImageResult } from '../../types/image';

// Constants for retry and rate limiting
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const MAX_BACKOFF_DELAY = 10000;
const REQUEST_DELAY = 1000;
const MIN_RATE_LIMIT_WAIT = 1000;
const QUEUE_TIMEOUT = 180000; // 180 second queue timeout
const REQUEST_TIMEOUT = 30000; // 30 second request timeout
const RATE_LIMIT_DELAY = 5000;
const MAX_CACHE_SIZE = 1000;
const MAX_CONCURRENT_REQUESTS = 1;
const MAX_BATCH_SIZE = 1;
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

// Cache configuration
const CACHE_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days - increased cache duration
const imageCache = new Map<string, { result: ImageResult; timestamp: number }>();

// Default fallback images
const FALLBACK_IMAGES = {
  default: {
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
  },
  food: {
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400'
  }
};

// Curated food images for common foods
export const CURATED_IMAGES: Record<string, ImageResult> = {
  'frango grelhado': {
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=400'
  },
  'arroz integral': {
    imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=400'
  },
  'salmão grelhado': {
    imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=400'
  },
  'ovos': {
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=400'
  }
};

export class ImageService {
  private static instance: ImageService;
  private rateLimitUntil: number = 0;
  private circuitBreakerState: 'OPEN' | 'CLOSED' | 'HALF_OPEN' = 'CLOSED';
  private circuitBreakerTimeout: number = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private consecutiveFailures = 0;
  private readonly CIRCUIT_BREAKER_RETRY_DELAY = 60000;
  private activeRequests = 0;
  private requestQueue: Array<{
    query: string;
    resolve: (value: ImageResult) => void;
    reject: (error: Error) => void;
    attempt?: number;
  }> = [];
  private isProcessingQueue = false;
  private readonly REQUEST_DELAY = 1000;

  private constructor() {}

  private async checkCircuitBreaker(): Promise<void> {
    if (this.circuitBreakerState === 'OPEN') {
      if (Date.now() < this.circuitBreakerTimeout) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      } else {
        this.circuitBreakerState = 'HALF_OPEN';
        this.consecutiveFailures = 0;
        console.log('Circuit breaker entering HALF_OPEN state');
      }
    }
  }

  private updateCircuitBreaker(success: boolean): void {
    if (success) {
      this.consecutiveFailures = 0;
      if (this.circuitBreakerState === 'HALF_OPEN') {
        this.circuitBreakerState = 'CLOSED';
        console.log('Circuit breaker CLOSED');
      }
    } else {
      this.consecutiveFailures++;
      console.warn(`Consecutive failures: ${this.consecutiveFailures}`);
      if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerState = 'OPEN';
        this.circuitBreakerTimeout = Date.now() + this.CIRCUIT_BREAKER_RETRY_DELAY;
        console.warn('Circuit breaker OPEN');
        throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      }
    }
  }

  static getInstance(): ImageService {
    if (!this.instance) {
      this.instance = new ImageService();
    }
    return this.instance;
  }

  private async generateImageWithGPT(query: string): Promise<string> {
    try {
      await this.checkCircuitBreaker();
      // Check rate limit
      if (Date.now() < this.rateLimitUntil) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        throw new Error(`Rate limit in effect. Please wait ${waitTime} seconds.`);
      }

      const apiKey = await getOpenAIKey();
      if (!apiKey) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          keepalive: true,
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `Food photo of ${query}`, // Simplified prompt to reduce token usage
            n: 1,
            size: "1024x1024", 
            quality: "standard", // Changed from HD to standard to reduce cost
            response_format: "b64_json"
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
            this.rateLimitUntil = Date.now() + (retryAfter * 1000);
            throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].b64_json;

      } catch (error: any) {
        clearTimeout(timeoutId);
        controller.abort();

        // Log error details
        console.error('Request failed:', {
          error: error.message,
          query
        });

        // Handle specific error types
        if (error.name === 'AbortError') {
          throw new Error('O serviço está demorando para responder. Por favor, aguarde alguns segundos e tente novamente.');
        }

        if (NETWORK_ERRORS.some(err => error.message.toLowerCase().includes(err))) {
          throw new Error('Erro de conexão. Verifique sua internet e aguarde alguns segundos antes de tentar novamente.');
        }

        throw error;
      }

    } catch (error) {
      this.updateCircuitBreaker(false);
      throw error;
    }
  }

  private async uploadToFirebase(imageData: string, foodName: string): Promise<ImageResult> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to upload images');
      }

      // Convert base64 to blob
      const byteString = atob(imageData);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Upload original image
      const imagePath = `food-images/generated/${foodName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      const imageRef = ref(storage, imagePath);
      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      // Create and upload thumbnail
      const thumbnailPath = `food-images/thumbnails/${foodName.toLowerCase().replace(/\s+/g, '-')}-thumb.jpg`;
      const thumbnailRef = ref(storage, thumbnailPath);
      await uploadBytes(thumbnailRef, blob);
      const thumbnailUrl = await getDownloadURL(thumbnailRef);

      return { imageUrl, thumbnailUrl };

    } catch (error) {
      console.error('Error uploading to Firebase:', error);
      throw error;
    }
  }

  async getImage(query: string, forceRefresh = false): Promise<ImageResult> {
    const cacheKey = query.toLowerCase().trim();

    // Add rate limit check
    if (Date.now() < this.rateLimitUntil) {
      const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
      throw new Error(`Rate limit in effect. Please wait ${waitTime} seconds.`);
    }

    // Return fallback for invalid queries
    if (!query?.trim()) {
      return FALLBACK_IMAGES.food;
    }
    
    // Check for curated images first
    const normalizedQuery = query.toLowerCase().trim();
    for (const [key, image] of Object.entries(CURATED_IMAGES)) {
      if (normalizedQuery.includes(key)) {
        console.log(`Using curated image for "${key}"`);
        return image;
      }
    }

    // Check memory cache first
    if (!forceRefresh) {
      const cached = imageCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }
    }

    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push({ query, resolve, reject });
      
      // Start processing queue if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    
    let timeoutId: NodeJS.Timeout;
    
    // Wait for any existing rate limit to expire
    const now = Date.now();
    if (now < this.rateLimitUntil) {
      const waitTime = this.rateLimitUntil - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    let currentBatch = 0;
    let failedRequests: typeof this.requestQueue = [];

    // Set overall timeout for queue processing
    const queueTimeoutId = setTimeout(() => {
      this.isProcessingQueue = false;
      this.requestQueue.forEach(request => {
        request.reject(new Error('O processamento da fila excedeu o tempo limite. Por favor, aguarde alguns segundos e tente novamente.'));
      });
      this.requestQueue = [];
    }, QUEUE_TIMEOUT);

    while (this.requestQueue.length > 0) {
      // Process smaller batches to avoid overwhelming the API
      const batchSize = Math.min(MAX_BATCH_SIZE, this.requestQueue.length);
      const batch = this.requestQueue.splice(0, batchSize);
      currentBatch++;
      
      const promises = batch.map(async (request) => {
        try {
          if (request.attempt && request.attempt >= MAX_RETRIES) {
            request.reject(new Error('Não foi possível carregar a imagem após várias tentativas. Por favor, tente novamente mais tarde.'));
            return;
          }

          const result = await this.processImageRequest(request.query);
          request.resolve(result);
        } catch (error) {
          if (error instanceof Error) {
            // Retry rate limit errors
            if (error.message.includes('Rate limit')) {
              // Ensure minimum wait time
              const waitTime = Math.max(
                MIN_RATE_LIMIT_WAIT,
                this.rateLimitUntil - Date.now()
              );
              console.warn(`Rate limit hit, waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              request.attempt = (request.attempt || 0) + 1;
              failedRequests.push(request);
              return;
            }
          }
          request.reject(error instanceof Error ? error : new Error('Unknown error'));
        }
      });

      await Promise.all(promises);

      // Add failed requests back to queue
      if (failedRequests.length > 0) {
        this.requestQueue.push(...failedRequests);
        console.warn(`Batch ${currentBatch}: ${failedRequests.length} requests failed, retrying after delay...`);
        failedRequests = [];
        // Wait before retrying
        const delay = RATE_LIMIT_DELAY * Math.pow(1.5, currentBatch - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Add delay between batches
      if (this.requestQueue.length > 0) {
        const delay = Math.min(
          REQUEST_DELAY * Math.pow(2, currentBatch - 1) + Math.random() * 1000,
          MAX_BACKOFF_DELAY
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    clearTimeout(queueTimeoutId);
    this.isProcessingQueue = false;
  }

  private async processImageRequest(query: string): Promise<ImageResult> {
    try {
      await this.checkCircuitBreaker();
      console.log(`Processing image request for "${query}"`);

      const cacheKey = query.toLowerCase().trim();

      // Return fallback for invalid queries
      if (!query?.trim()) {
        console.log('Invalid query, using fallback');
        return FALLBACK_IMAGES.food;
      }

      // Check memory cache first
      try {
        const cached = imageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached image');
          this.updateCircuitBreaker(true);
          return cached.result;
        }
      } catch (error) {
        console.warn('Cache read error:', error);
        // Continue without cache
      }

      let result: ImageResult;
      console.log('Generating new image');

      // Generate image with GPT
      const imageData = await this.generateImageWithGPT(query);
      console.log('Image generated successfully');

      // Check if circuit breaker opened during image generation
      if (this.circuitBreakerState === 'OPEN') {
        throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
      }

      // Upload to Firebase
      result = await this.uploadToFirebase(imageData, query);
      console.log('Image uploaded to Firebase');
      this.updateCircuitBreaker(true);

      // Update cache
      imageCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      // Cleanup cache if too large
      if (imageCache.size > MAX_CACHE_SIZE) {
        const oldestKey = Array.from(imageCache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
        imageCache.delete(oldestKey);
      }

      return result;

    } catch (error) {
      this.updateCircuitBreaker(false);
      console.error('Error getting image:', error);
      return FALLBACK_IMAGES.food;
    }
  }

  // Helper method to get circuit breaker status
  getCircuitBreakerStatus(): {
    state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
    consecutiveFailures: number;
    timeUntilReset?: number;
  } {
    return {
      state: this.circuitBreakerState,
      consecutiveFailures: this.consecutiveFailures,
      timeUntilReset: this.circuitBreakerState === 'OPEN' 
        ? Math.max(0, this.circuitBreakerTimeout - Date.now())
        : undefined
    };
  }

  async cleanupCache(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of imageCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        imageCache.delete(key);
      }
    }
  }
}