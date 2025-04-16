import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
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
  try {
    const cacheRef = doc(db, 'imageCache', query.toLowerCase().replace(/\s+/g, '-'));
    const cacheDoc = await getDoc(cacheRef);
    
    if (!cacheDoc.exists()) return null;
    
    const cachedData = cacheDoc.data();
    const cachedTime = new Date(cachedData.timestamp);
    
    if ((Date.now() - cachedTime.getTime()) > CACHE_DURATION) {
      return null;
    }
    
    return {
      imageUrl: cachedData.imageUrl,
      thumbnailUrl: cachedData.thumbnailUrl
    };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

async function cacheImage(query: string, imageUrl: string, thumbnailUrl: string): Promise<void> {
  try {
    const cacheRef = doc(db, 'imageCache', query.toLowerCase().replace(/\s+/g, '-'));
    await setDoc(cacheRef, {
      imageUrl,
      thumbnailUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

// Helper for exponential backoff
async function wait(attempt: number): Promise<void> {
  const delay = Math.min(RETRY_DELAY * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
}

export async function getUnsplashImage(query: string): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const isFood = query.toLowerCase().includes('food');
  const fallback = isFood ? FALLBACK_IMAGES.food : FALLBACK_IMAGES.default;

  try {
    // Check cache first
    const cachedImage = await getCachedImage(query);
    if (cachedImage && cachedImage.imageUrl) {
      return cachedImage;
    }

    // Validate API key
    if (!ACCESS_KEY?.trim()) {
      console.warn('Unsplash API key not configured, using fallback image');
      return fallback;
    }

    // Implement retry logic
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(
          `${UNSPLASH_API_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          {
            headers: {
              'Authorization': `Client-ID ${ACCESS_KEY}`,
              'Accept-Version': 'v1',
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Invalid Unsplash API key, using fallback image');
            return fallback;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.results?.[0]) {
          return fallback;
        }

        const result = {
          imageUrl: data.results[0].urls.regular,
          thumbnailUrl: data.results[0].urls.thumb
        };
        
        // Cache successful result
        await cacheImage(query, result.imageUrl, result.thumbnailUrl);
        return result;

      } catch (error) {
        console.warn('Unsplash API error:', error);
        if (attempt === MAX_RETRIES - 1) {
          return fallback;
        }
        await wait(attempt);
      }
    }

    return fallback;
  } catch (error) {
    console.warn('Error fetching Unsplash image:', error);
    return fallback;
  }
}