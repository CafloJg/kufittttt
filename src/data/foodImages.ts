import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { getImage } from '../utils/imageService';
import type { ImageResult } from '../types/image';

// Constants for retry and rate limiting
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const BATCH_SIZE = 3;
const MAX_CACHE_SIZE = 1000;

// Food categories with their items
export const foodCategories = {
  grains: {
    title: '🌾 Grãos e Cereais Integrais',
    items: [
      { name: 'Arroz integral', searchTerm: 'cooked brown rice gourmet plated restaurant' },
      { name: 'Quinoa', searchTerm: 'cooked quinoa gourmet plated restaurant' },
      { name: 'Aveia', searchTerm: 'oatmeal porridge close up isolated' },
      { name: 'Cevada', searchTerm: 'cooked barley gourmet plated restaurant' },
      { name: 'Trigo-sarraceno', searchTerm: 'cooked buckwheat gourmet plated restaurant' },
      { name: 'Milho', searchTerm: 'corn gourmet plated restaurant' },
      { name: 'Centeio', searchTerm: 'cooked rye grains close up isolated' },
      { name: 'Espelta', searchTerm: 'cooked spelt grains close up isolated' },
      { name: 'Arroz selvagem', searchTerm: 'cooked wild rice close up isolated' },
      { name: 'Farro', searchTerm: 'cooked farro grains close up isolated' },
      { name: 'Amaranto', searchTerm: 'cooked amaranth grains close up isolated' },
      { name: 'Teff', searchTerm: 'cooked teff grains close up isolated' },
      { name: 'Sorgo', searchTerm: 'cooked sorghum grains close up isolated' },
      { name: 'Trigo integral', searchTerm: 'whole wheat grains close up isolated' },
      { name: 'Bulgur', searchTerm: 'cooked bulgur wheat close up isolated' },
      { name: 'Freekeh', searchTerm: 'cooked freekeh grains close up isolated' },
      { name: 'Kamut', searchTerm: 'cooked kamut grains close up isolated' },
      { name: 'Massa integral', searchTerm: 'whole wheat pasta cooked close up' },
      { name: 'Pão integral', searchTerm: 'whole grain bread sliced close up' }
    ]
  },
  legumes: {
    title: '🫘 Leguminosas e Oleaginosas',
    items: [
      { name: 'Feijão preto', searchTerm: 'cooked black beans close up isolated' },
      { name: 'Grão-de-bico', searchTerm: 'cooked chickpeas close up isolated' },
      { name: 'Lentilhas', searchTerm: 'cooked lentils close up isolated' },
      { name: 'Feijão vermelho', searchTerm: 'cooked red kidney beans close up isolated' },
      { name: 'Feijão branco', searchTerm: 'cooked white beans close up isolated' },
      { name: 'Ervilhas', searchTerm: 'cooked green peas close up isolated' },
      { name: 'Fava', searchTerm: 'cooked fava beans close up isolated' },
      { name: 'Soja', searchTerm: 'cooked soybeans close up isolated' },
      { name: 'Feijão-fradinho', searchTerm: 'cooked black eyed peas close up isolated' },
      { name: 'Feijão-carioca', searchTerm: 'cooked pinto beans close up isolated' },
      { name: 'Castanha-do-pará', searchTerm: 'brazil nuts close up isolated' },
      { name: 'Castanha de caju', searchTerm: 'cashew nuts close up isolated' },
      { name: 'Amêndoas', searchTerm: 'almonds close up isolated' },
      { name: 'Nozes', searchTerm: 'walnuts close up isolated' },
      { name: 'Pistache', searchTerm: 'pistachios close up isolated' },
      { name: 'Macadâmia', searchTerm: 'macadamia nuts close up isolated' },
      { name: 'Avelã', searchTerm: 'hazelnuts close up isolated' },
      { name: 'Amendoim', searchTerm: 'peanuts close up isolated' }
    ]
  },
  fruits: {
    title: '🍎 Frutas',
    items: [
      { name: 'Maçã', searchTerm: 'fresh red apple isolated' },
      { name: 'Banana', searchTerm: 'fresh banana isolated' },
      { name: 'Laranja', searchTerm: 'fresh orange isolated' },
      { name: 'Manga', searchTerm: 'fresh mango isolated' },
      { name: 'Uva', searchTerm: 'fresh grapes bunch isolated' },
      { name: 'Morango', searchTerm: 'fresh strawberries isolated' },
      { name: 'Abacaxi', searchTerm: 'fresh pineapple isolated' },
      { name: 'Melancia', searchTerm: 'fresh watermelon sliced isolated' },
      { name: 'Mamão', searchTerm: 'fresh papaya sliced isolated' },
      { name: 'Kiwi', searchTerm: 'fresh kiwi sliced isolated' },
      { name: 'Pera', searchTerm: 'fresh pear isolated' },
      { name: 'Pêssego', searchTerm: 'fresh peach isolated' },
      { name: 'Ameixa', searchTerm: 'fresh plum isolated' },
      { name: 'Cereja', searchTerm: 'fresh cherries isolated' },
      { name: 'Framboesa', searchTerm: 'fresh raspberries isolated' },
      { name: 'Mirtilo', searchTerm: 'fresh blueberries isolated' },
      { name: 'Goiaba', searchTerm: 'fresh guava isolated' },
      { name: 'Maracujá', searchTerm: 'fresh passion fruit isolated' }
    ]
  },
  vegetables: {
    title: '🥬 Vegetais',
    items: [
      { name: 'Brócolis', searchTerm: 'steamed broccoli plate served' },
      { name: 'Couve-flor', searchTerm: 'cauliflower plate served' },
      { name: 'Espinafre', searchTerm: 'sauteed spinach plate served' },
      { name: 'Couve', searchTerm: 'sauteed kale plate served' },
      { name: 'Alface', searchTerm: 'lettuce salad plate served' },
      { name: 'Rúcula', searchTerm: 'fresh arugula leaves isolated' },
      { name: 'Agrião', searchTerm: 'fresh watercress isolated' },
      { name: 'Repolho', searchTerm: 'fresh cabbage isolated' },
      { name: 'Cenoura', searchTerm: 'fresh carrots isolated' },
      { name: 'Beterraba', searchTerm: 'fresh beetroot isolated' },
      { name: 'Pepino', searchTerm: 'fresh cucumber isolated' },
      { name: 'Abobrinha', searchTerm: 'fresh zucchini isolated' },
      { name: 'Berinjela', searchTerm: 'fresh eggplant isolated' },
      { name: 'Pimentão', searchTerm: 'fresh bell peppers isolated' },
      { name: 'Tomate', searchTerm: 'fresh tomato isolated' },
      { name: 'Batata-doce', searchTerm: 'fresh sweet potato isolated' },
      { name: 'Inhame', searchTerm: 'fresh yam isolated' },
      { name: 'Mandioca', searchTerm: 'fresh cassava isolated' }
    ]
  },
  proteins: {
    title: '🥩 Proteínas e Laticínios',
    items: [
      { name: 'Frango grelhado', searchTerm: 'grilled chicken breast gourmet plated restaurant professional' },
      { name: 'Carne bovina', searchTerm: 'grilled beef steak gourmet plated restaurant professional' },
      { name: 'Ovos', searchTerm: 'fried eggs gourmet breakfast plated restaurant professional' },
      { name: 'Peixe branco', searchTerm: 'white fish fillet gourmet plated restaurant professional' },
      { name: 'Salmão', searchTerm: 'grilled salmon gourmet plated restaurant professional' },
      { name: 'Sardinha', searchTerm: 'grilled sardines gourmet plated restaurant professional' },
      { name: 'Atum', searchTerm: 'tuna steak gourmet plated restaurant professional' },
      { name: 'Tilápia', searchTerm: 'tilapia fillet gourmet plated restaurant professional' },
      { name: 'Queijo cottage', searchTerm: 'cottage cheese close up isolated' },
      { name: 'Ricota', searchTerm: 'ricotta cheese close up isolated' },
      { name: 'Mussarela de búfala', searchTerm: 'buffalo mozzarella cheese close up isolated' },
      { name: 'Queijo de cabra', searchTerm: 'goat cheese close up isolated' },
      { name: 'Iogurte natural', searchTerm: 'plain yogurt close up isolated' },
      { name: 'Iogurte grego', searchTerm: 'greek yogurt close up isolated' },
      { name: 'Coalhada', searchTerm: 'curd cheese close up isolated' },
      { name: 'Queijo minas', searchTerm: 'fresh white cheese close up isolated' },
      { name: 'Queijo feta', searchTerm: 'feta cheese close up isolated' },
      { name: 'Requeijão light', searchTerm: 'light cream cheese close up isolated' }
    ]
  }
};

// High-quality curated images for common foods
const CURATED_IMAGES: Record<string, ImageResult> = {
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
// Helper to get storage path
function getStoragePath(category: string, foodName: string): string {
  return `food-database/${category}/${foodName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
}

// Helper to check if image exists in storage
async function checkImageExists(path: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, path);
    await getMetadata(storageRef);
    return true;
  } catch {
    return false;
  }
}

// Helper for exponential backoff
async function wait(attempt: number): Promise<void> {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
}

// Helper to process items in batches
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = BATCH_SIZE
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
    
    // Add delay between batches
    if (i + batchSize < items.length) {
      await wait(0);
    }
  }
  
  return results;
}

// Function to download and store a single food image
async function downloadAndStoreFoodImage(
  category: string,
  foodName: string,
  searchTerm: string
): Promise<ImageResult> {
  const imagePath = getStoragePath(category, foodName);
  
  // Check if image already exists
  try {
    if (await checkImageExists(imagePath)) {
      const storageRef = ref(storage, imagePath);
      const imageUrl = await getDownloadURL(storageRef);
      return {
        imageUrl,
        thumbnailUrl: imageUrl.replace('w=2000', 'w=400')
      };
    }
  } catch (error) {
    console.warn('Error checking existing image:', error);
  }

  // Check curated images
  const normalizedName = foodName.toLowerCase();
  if (CURATED_IMAGES[normalizedName]) {
    return CURATED_IMAGES[normalizedName];
  }

  // Implement retry logic
  let lastError: Error | null = null;
  
  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Get high-quality image
        const image = await getImage(`${searchTerm} professional food photography`);
        
        // Create storage reference
        const storageRef = ref(storage, imagePath);
        
        // Download and upload with validation
        const response = await fetch(image.imageUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Empty image blob');
        
        await uploadBytes(storageRef, blob);
        const storedUrl = await getDownloadURL(storageRef);
        
        return {
          imageUrl: storedUrl,
          thumbnailUrl: image.thumbnailUrl
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < MAX_RETRIES - 1) {
          await wait(attempt);
          continue;
        }
      }
    }
    throw lastError;
  } catch (error) {
    console.error(`Error downloading image for ${foodName}:`, error);
    throw error;
  }
}

// Helper to enhance search terms
function enhanceSearchTerm(term: string): string {
  return `${term} gourmet plated restaurant professional food photography`;
}

// Function to download all food images with improved concurrency
export async function downloadAllFoodImages(
  onProgress?: (current: number, total: number, item: string) => void
): Promise<void> {
  const totalItems = Object.values(foodCategories)
    .reduce((sum, category) => sum + category.items.length, 0);
  let processedItems = 0;
  let errors: Array<{ item: string; error: Error }> = [];

  for (const [category, data] of Object.entries(foodCategories)) {
    // Process items in batches with concurrency limit
    const items = data.items.map(item => ({
      category,
      item,
      retries: 0
    }));
    
    await processBatch(items, async ({ category, item }) => {
      try {
        await downloadAndStoreFoodImage(category, item.name, enhanceSearchTerm(item.searchTerm));
        processedItems++;
        
        if (onProgress) {
          onProgress(processedItems, totalItems, item.name);
        }
      } catch (error) {
        errors.push({
          item: item.name,
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    });
  }
  
  // Log summary of errors
  if (errors.length > 0) {
    console.warn('Failed to download some images:', {
      totalErrors: errors.length,
      errors: errors.map(e => ({ item: e.item, error: e.error.message }))
    });
  }
}

// Function to get stored food image URL
export async function getFoodImageUrl(
  category: string,
  foodName: string
): Promise<string> {
  try {
    const imagePath = getStoragePath(category, foodName);
    const storageRef = ref(storage, imagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error(`Error getting image for ${foodName}:`, error);
    throw error;
  }
}