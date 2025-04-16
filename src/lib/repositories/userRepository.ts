import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../../types/user';
import { z } from 'zod';

const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  photoURL: z.string().optional(),
  subscriptionTier: z.enum(['basic', 'premium', 'premium-plus']),
  subscriptionStatus: z.enum(['active', 'inactive', 'cancelled']),
  createdAt: z.date(),
  completedOnboarding: z.boolean(),
  // Add other fields as needed
});

export class UserRepository {
  private static instance: UserRepository;

  private constructor() {}

  static getInstance(): UserRepository {
    if (!this.instance) {
      this.instance = new UserRepository();
    }
    return this.instance;
  }

  async getUser(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      const validatedUser = userSchema.parse(userData);
      return validatedUser as UserProfile;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async createUser(userData: UserProfile): Promise<void> {
    try {
      const validatedUser = userSchema.parse(userData);
      await setDoc(doc(db, 'users', userData.uid), validatedUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}