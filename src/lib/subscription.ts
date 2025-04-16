import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { SubscriptionTier } from '../types/user';

export async function updateUserSubscriptionTier(
  email: string,
  tier: SubscriptionTier
): Promise<void> {
  try {
    // Get user document by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Usuário não encontrado');
    }

    // Get the first (and should be only) matching document
    const userDoc = querySnapshot.docs[0];

    // Update the user's subscription tier
    await updateDoc(doc(db, 'users', userDoc.id), {
      subscriptionTier: tier,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    throw new Error('Não foi possível atualizar a assinatura');
  }
}