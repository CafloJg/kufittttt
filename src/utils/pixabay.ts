import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const PIXABAY_API_URL = 'https://pixabay.com/api';
const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_API_KEY || '';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const QUALITY_THRESHOLD = 0.8; // Even higher quality threshold
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Default fallback images
const FALLBACK_IMAGES = {
  default: {
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'
  },
  food: {
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'
  }
};

async function getCachedImage(query: string): Promise<{ imageUrl: string; thumbnailUrl: string } | null> {
  if (!auth.currentUser) return null;
  
  try {
    const cacheRef = doc(db, 'users', auth.currentUser.uid, 'imageCache', `pixabay_${query}`);
    const cacheDoc = await getDoc(cacheRef);
    
    if (!cacheDoc.exists()) return null;
    
    const cachedResult = cacheDoc.data();
    if (!cachedResult) return null;
    
    const cacheTime = new Date(cachedResult.timestamp);
    const now = new Date();
    if (now.getTime() - cacheTime.getTime() > CACHE_DURATION) return null;
    
    return {
      imageUrl: cachedResult.imageUrl,
      thumbnailUrl: cachedResult.thumbnailUrl
    };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

async function cacheImage(query: string, imageUrl: string, thumbnailUrl: string): Promise<void> {
  if (!auth.currentUser) return;
  
  try {
    const cacheRef = doc(db, 'users', auth.currentUser.uid, 'imageCache', `pixabay_${query}`);
    await setDoc(cacheRef, {
      imageUrl,
      thumbnailUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

// Helper to enhance search terms
function enhanceSearchQuery(query: string): string {
  query = query.replace(/\bfood\b/g, '').trim();
  
  // Add high-quality photo requirements
  if (query.includes('isolated')) {
    return `${query} white background food high quality`;
  }
  
  // Add high-quality photo requirements
  if (query.includes('studio photography')) {
    return `${query} professional lighting high quality`;
  }

  // Special handling for prepared foods
  if (query.includes('cooked') || query.includes('grilled') || query.includes('fried')) {
    return `${query} food white background high quality`;
  }
  
  // Special handling for fresh ingredients
  if (query.includes('fresh')) {
    return `${query} food white background high quality`;
  }
  
  // Special handling for fruits and vegetables
  if (query.includes('fruit') || query.includes('vegetable')) {
    return `${query} food white background high quality`;
  }
  
  return `${query} food white background high quality`;
}

// Helper to score image quality
function scoreImage(photo: any): number {
  if (!photo || !photo.imageWidth || !photo.imageHeight) return 0;
  
  // Special scoring for fruit images
  const isFruit = photo.tags?.toLowerCase().includes('fruit') || 
                 photo.tags?.toLowerCase().includes('isolated');

  const ratio = photo.imageWidth / photo.imageHeight;
  const aspectScore = isFruit
    ? Math.max(0, 1 - Math.abs(ratio - 1)) // Prefer square ratio for fruits
    : Math.max(0, 1 - Math.abs(ratio - 1.77));
  
  const resolutionScore = Math.min(
    1,
    (photo.imageWidth >= 1200 ? 0.5 : 0.2) +
    (photo.imageHeight >= 800 ? 0.5 : 0.2)
  );
  
  // Adjust popularity scoring for fruits
  const popularityScore = isFruit
    ? Math.min(1, (photo.likes || 0) / 500) // Lower threshold for fruit images
    : Math.min(1, (photo.likes || 0) / 1000);
  
  return (
    aspectScore * 0.4 +      // 40% aspect ratio
    resolutionScore * 0.4 +  // 40% resolution
    popularityScore * 0.2    // 20% popularity
  );
}

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

export async function getPixabayImage(query: string): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const isFood = query.toLowerCase().includes('food');
  const fallback = isFood ? FALLBACK_IMAGES.food : FALLBACK_IMAGES.default;
  
  // Clean up query
  query = query.trim().toLowerCase();
  
  // Skip API call for known problematic queries
  if (query.length < 3 || query.length > 100) {
    console.warn(`Invalid query length: ${query}`);
    return fallback;
  }
  
  const enhancedQuery = enhanceSearchQuery(query);

  try {
    // Check cache first
    const cachedImage = await getCachedImage(query);
    if (cachedImage) {
      return cachedImage;
    }

    const response = await fetchWithRetry(
      `${PIXABAY_API_URL}?` + new URLSearchParams({
        key: API_KEY,
        q: `${enhancedQuery} food`,
        per_page: '30', // Increased to get more options
        image_type: 'photo',
        orientation: 'horizontal',
        category: 'food',
        lang: 'pt',
        safesearch: 'true',
        min_width: '1200',
        min_height: '800',
        order: 'popular',
        editors_choice: 'true' // Added to get higher quality images
      })
    );

    const data = await response.json();
    
    // Handle API errors
    if (data.error) {
      console.error(`Pixabay API error: ${data.error}`);
      return fallback;
    }
    
    if (!data.hits?.[0]) {
      console.warn(`No images found for query: ${query}`);
      return fallback;
    }

    // Score and sort photos
    const scoredPhotos = data.hits
      .map(photo => ({
        photo,
        score: scoreImage(photo),
        quality: photo.imageSize > 1000000 ? 1 : 0.5 // Prefer larger images
      }))
      .sort((a, b) => b.score - a.score);

    // Use best scoring photo that meets threshold
    let bestPhoto = scoredPhotos.find(p => p.score >= QUALITY_THRESHOLD)?.photo;
    
    // If no photo meets threshold, try highest scoring one
    if (!bestPhoto) {
      console.warn(`No photos met quality threshold for: ${query}`);
      bestPhoto = scoredPhotos[0]?.photo || data.hits[0];
    }

    if (!bestPhoto?.largeImageURL) {
      console.warn(`Invalid photo data for: ${query}`);
      return fallback;
    }

    const result = {
      imageUrl: bestPhoto.largeImageURL.replace(/\_\d+\.jpg$/, '_1920.jpg'),
      thumbnailUrl: bestPhoto.previewURL.replace(/\_\d+\.jpg$/, '_400.jpg'),
      quality: scoreImage(bestPhoto)
    };
    
    // Cache successful result
    if (auth.currentUser) {
      await cacheImage(query, result.imageUrl, result.thumbnailUrl);
    }
    
    return result;
  } catch (error) {
    // Log error details and return fallback gracefully
    console.warn(`Error fetching Pixabay image for "${query}":`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
      enhancedQuery
    });
    // Return fallback with high-quality URLs
    return {
      imageUrl: fallback.imageUrl.replace(/\?.*$/, '?q=80&w=1920'),
      thumbnailUrl: fallback.thumbnailUrl.replace(/\?.*$/, '?q=80&w=400')
    };
  }
}