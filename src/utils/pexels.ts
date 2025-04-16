import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const PEXELS_API_URL = 'https://api.pexels.com/v1';
const API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCachedImage(query: string): Promise<{ imageUrl: string; thumbnailUrl: string } | null> {
  if (!auth.currentUser) return null;
  
  const cacheRef = doc(db, 'users', auth.currentUser.uid, 'pexelsCache', query);
  
  try {
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
    console.error('Error getting cached image:', error);
    return null;
  }
}

async function cacheImage(query: string, imageUrl: string, thumbnailUrl: string): Promise<void> {
  if (!auth.currentUser) return;
  
  const cacheRef = doc(db, 'users', auth.currentUser.uid, 'pexelsCache', query);
  
  try {
    await setDoc(cacheRef, {
      imageUrl,
      thumbnailUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error caching image:', error);
  }
}

export async function getPexelsImage(query: string): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  try {
    // Check cache first
    const cachedImage = await getCachedImage(query);
    if (cachedImage) return cachedImage;

    const response = await fetch(
      `${PEXELS_API_URL}/search?` + new URLSearchParams({
        query: query,
        per_page: '5',
        orientation: 'landscape',
        size: 'medium',
        locale: 'pt-BR'
      }),
      {
        headers: {
          'Authorization': API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.photos?.[0]) {
      throw new Error('No images found');
    }

    // Select best photo based on ratio and relevance
    const bestPhoto = data.photos.reduce((best, current) => {
      const bestRatio = best.width / best.height;
      const currentRatio = current.width / current.height;
      return Math.abs(currentRatio - 1.77) < Math.abs(bestRatio - 1.77) ? current : best;
    }, data.photos[0]);

    const result = {
      imageUrl: bestPhoto.src.large,
      thumbnailUrl: bestPhoto.src.small
    };
    
    // Cache result
    await cacheImage(query, result.imageUrl, result.thumbnailUrl);
    return result;

  } catch (error) {
    console.error('Error fetching Pexels image:', error);
    throw error;
  }
}