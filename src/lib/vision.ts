import { analyzeImageWithOpenAI } from './openai';
import type { FoodAnalysis } from '../types/food';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const MIN_IMAGE_SIZE = 1024; // 1KB
const MIN_CONFIDENCE = 0.7;

async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;

  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Retry attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}:`, {
        error: lastError.message,
        stack: lastError.stack
      });

      // Don't retry certain errors
      if (lastError.message.toLowerCase().includes('api key') ||
          lastError.message.toLowerCase().includes('formato inválido') ||
          lastError.message.toLowerCase().includes('muito grande') ||
          lastError.message.toLowerCase().includes('muito pequena')) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw lastError || error;
  }
}

interface ImageValidation {
  base64Content: string;
  imageSize: number;
  mimeType: string;
}

function validateImage(imageData: string): ImageValidation {
  if (!imageData) {
    throw new Error('Nenhuma imagem fornecida. Tente novamente.');
  }

  const [header, base64Content] = imageData.split(',');
  
  if (!header || !header.startsWith('data:image/')) {
    throw new Error('Formato de imagem inválido. Use uma foto no formato JPG ou PNG.');
  }

  const mimeType = header.split(':')[1].split(';')[0];
  if (!['image/jpeg', 'image/png'].includes(mimeType)) {
    throw new Error('Formato não suportado. Use apenas fotos JPG ou PNG.');
  }

  if (!base64Content) {
    throw new Error('Imagem inválida. Tente tirar outra foto.');
  }

  const imageSize = (base64Content.length * 3) / 4;
  
  if (imageSize > MAX_IMAGE_SIZE) {
    throw new Error(`Imagem muito grande (${Math.round(imageSize/1024/1024)}MB). Use uma foto menor que 4MB.`);
  }

  if (imageSize < MIN_IMAGE_SIZE) {
    throw new Error('Imagem muito pequena. Tente tirar uma foto mais nítida.');
  }

  return { base64Content, imageSize, mimeType };
}

export async function analyzeImageWithGoogleVision(imageData: string): Promise<FoodAnalysis> {
  try {
    // Validate image before processing
    if (!imageData) {
      throw new Error('Nenhuma imagem fornecida. Tente novamente.');
    }

    const [header, base64Content] = imageData.split(',');
    
    if (!header || !header.startsWith('data:image/')) {
      throw new Error('Formato de imagem inválido. Use uma foto no formato JPG ou PNG.');
    }

    const mimeType = header.split(':')[1].split(';')[0];
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      throw new Error('Formato não suportado. Use apenas fotos JPG ou PNG.');
    }

    if (!base64Content) {
      throw new Error('Imagem inválida. Tente tirar outra foto.');
    }

    const imageSize = (base64Content.length * 3) / 4;
    
    if (imageSize > MAX_IMAGE_SIZE) {
      throw new Error(`Imagem muito grande (${Math.round(imageSize/1024/1024)}MB). Use uma foto menor que 4MB.`);
    }

    if (imageSize < MIN_IMAGE_SIZE) {
      throw new Error('Imagem muito pequena. Tente tirar uma foto mais nítida.');
    }
    
    // Log validation results for debugging
    console.log('Image validation successful:', {
      size: `${Math.round(imageSize/1024)}KB`,
      type: mimeType
    });

    // Analyze image with retries
    const analysis = await retryWithDelay(
      async () => {
        // Use GPT-4 Vision for image analysis
        const result = await analyzeImageWithOpenAI(imageData);
        if (!result || !result.ingredients || result.ingredients.length === 0) {
          throw new Error('Nenhum alimento detectado. Tente uma foto mais clara.');
        }
        // Ensure confidence score is normalized for GPT-4 Vision
        if (result.confidence) {
          result.confidence = Math.min(Math.max(result.confidence, 0), 1);
        }
        return result;
      }
    );

    // Validate analysis structure
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Erro ao processar análise. Tente novamente.');
    }
    
    // Validate ingredients
    if (!analysis.ingredients || !Array.isArray(analysis.ingredients)) {
      throw new Error('Erro ao identificar alimentos. Tente novamente.');
    }
    
    if (analysis.ingredients.length === 0) {
      throw new Error('Nenhum alimento identificado. Tente uma foto mais clara ou de outro ângulo.');
    }
    
    // Validate confidence
    if (!analysis.confidence || typeof analysis.confidence !== 'number') {
      throw new Error('Erro na análise de confiança. Tente novamente.');
    }
    
    if (analysis.confidence < MIN_CONFIDENCE) {
      throw new Error('Não foi possível identificar os alimentos com certeza. Tente uma foto mais clara.');
    }
    
    // Return validated analysis
    return {
      ingredients: analysis.ingredients,
      preparation: Array.isArray(analysis.preparation) ? analysis.preparation : [],
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
      imageUrl: imageData
    };

  } catch (error) {
    // Log error with full details for debugging
    console.error('Vision analysis error:', {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Network errors
      if (errorMessage.includes('failed to fetch') || 
          errorMessage.includes('network error') ||
          errorMessage.includes('connection')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      
      // API errors
      if (errorMessage.includes('api key')) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        throw new Error('Muitas solicitações. Por favor, aguarde alguns minutos.');
      }
      
      // Timeout errors
      if (errorMessage.includes('timeout')) {
        throw new Error('O serviço está demorando para responder. Tente novamente em alguns minutos.');
      }
      
      // Image validation errors
      if (errorMessage.includes('formato') || 
          errorMessage.includes('resolução') ||
          errorMessage.includes('tente') ||
          errorMessage.includes('muito grande') ||
          errorMessage.includes('muito pequena')) {
        throw error;
      }
      
      // Analysis errors
      if (errorMessage.includes('nenhum alimento') ||
          errorMessage.includes('não foi possível identificar')) {
        throw error;
      }
    }
    
    // Friendly error for unhandled cases
    throw new Error('Erro ao analisar imagem. Por favor, tente uma foto mais clara ou de outro ângulo.');
  }
}