import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile, SubscriptionTier } from '../../types/user';

// Track feature usage in Firestore
export async function incrementFeatureUsage(
  userId: string,
  feature: string
): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const usageRef = doc(db, 'usage', `${userId}_${feature}`);

  try {
    const usageDoc = await getDoc(usageRef);
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (!usageDoc.exists() || usageDoc.data().resetDate < now) {
      // Create new usage record
      await updateDoc(usageRef, {
        count: 1,
        resetDate: resetDate,
        updatedAt: now
      });
      return 1;
    } else {
      // Update existing record
      const newCount = (usageDoc.data().count || 0) + 1;
      await updateDoc(usageRef, {
        count: newCount,
        updatedAt: now
      });
      return newCount;
    }
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    throw error;
  }
}

// Check if user can access a feature
export async function canAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data() as UserProfile;
    const tier = userData.subscriptionTier;

    // Get feature limit based on tier
    const limit = getFeatureLimit(tier, feature);
    
    // Unlimited access for premium-plus
    if (limit === -1) return true;
    
    // Check current usage
    const usageRef = doc(db, 'usage', `${userId}_${feature}`);
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) return true;
    
    const usage = usageDoc.data();
    const now = new Date();
    
    // Reset usage if past reset date
    if (usage.resetDate < now) return true;
    
    return usage.count < limit;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

// Get feature limit based on subscription tier
function getFeatureLimit(tier: SubscriptionTier, feature: string): number {
  switch (tier) {
    case 'basic':
      switch (feature) {
        case 'diet_plans': return 3;
        case 'nutritionist_sessions': return 0;
        case 'custom_goals': return 3;
        default: return 0;
      }
    case 'premium':
      switch (feature) {
        case 'diet_plans': return 20;
        case 'nutritionist_sessions': return 3;
        case 'custom_goals': return 10;
        case 'video_lessons': return 10;
        default: return 0;
      }
    case 'premium-plus':
      return -1; // Unlimited
    default:
      return 0;
  }
}

// Track nutritionist sessions
export async function trackNutritionistSession(
  userId: string,
  nutritionistId: string,
  scheduledFor: Date,
  isEmergency: boolean = false
): Promise<void> {
  const sessionRef = doc(collection(db, 'nutritionist_sessions'));
  
  await updateDoc(sessionRef, {
    userId,
    nutritionistId,
    scheduledFor,
    status: 'scheduled',
    isEmergency,
    platform: 'video',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// Get available nutritionist slots
export async function getAvailableSlots(
  userId: string,
  isEmergency: boolean = false
): Promise<Date[]> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) throw new Error('User not found');

  const userData = userDoc.data() as UserProfile;
  const slots: Date[] = [];
  const now = new Date();

  // Generate slots based on subscription tier
  switch (userData.subscriptionTier) {
    case 'premium-plus':
      // 24/7 availability
      for (let hour = 0; hour < 24; hour++) {
        const slot = new Date(now);
        slot.setHours(hour, 0, 0, 0);
        if (slot > now) {
          slots.push(slot);
          // Add 30-minute slots
          const halfHourSlot = new Date(slot);
          halfHourSlot.setMinutes(30);
          slots.push(halfHourSlot);
        }
      }
      break;

    case 'premium':
      // 3x per week availability
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      for (let day = 0; day < 7; day++) {
        if (day % 2 === 1) { // Monday, Wednesday, Friday
          for (let hour = 9; hour < 18; hour++) {
            const slot = new Date(weekStart);
            slot.setDate(slot.getDate() + day);
            slot.setHours(hour, 0, 0, 0);
            if (slot > now) {
              slots.push(slot);
              // Add 30-minute slots
              const halfHourSlot = new Date(slot);
              halfHourSlot.setMinutes(30);
              slots.push(halfHourSlot);
            }
          }
        }
      }
      break;

    default:
      // No slots available for basic plan
      break;
  }

  return slots;
}