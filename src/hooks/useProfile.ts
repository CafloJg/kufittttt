import { useState, useCallback } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../context/UserContext';
import type { UserProfile } from '../types/user';

export function useProfile() {
  const { user, refreshUserData } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Add updatedAt timestamp
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Remove refreshUserData function from the data to be saved to Firestore
      const { refreshUserData: _, ...firestoreUpdateData } = updatedData;
      
      console.log('Updating profile:', firestoreUpdateData);
      
      // Use try-catch with retry logic for the Firestore operation
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount < maxRetries) {
        try {
          await updateDoc(userRef, firestoreUpdateData);
          break; // Success, exit the loop
        } catch (updateError) {
          retryCount++;
          console.warn(`Error updating profile (attempt ${retryCount}/${maxRetries}):`, updateError);
          
          if (retryCount >= maxRetries) {
            throw updateError; // Rethrow after max retries
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
      
      // Refresh user data
      const updatedUser = await refreshUserData();
      return updatedUser;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [user, refreshUserData, setError]);

  const uploadProfilePhoto = useCallback(async (file: File) => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 5MB');
      }
      
      if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem');
      }
      
      // Upload to storage
      const storageRef = ref(storage, `profile-photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      // Update user profile
      const userRef = doc(db, 'users', user.uid);
      
      // Use try-catch with retry logic for the Firestore operation
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount < maxRetries) {
        try {
          await updateDoc(userRef, {
            photoURL,
            updatedAt: new Date().toISOString()
          });
          break; // Success, exit the loop
        } catch (updateError) {
          retryCount++;
          console.warn(`Error updating profile photo (attempt ${retryCount}/${maxRetries}):`, updateError);
          
          if (retryCount >= maxRetries) {
            throw updateError; // Rethrow after max retries
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
      
      // Refresh user data
      await refreshUserData();
      
      return photoURL;
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload da foto');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, refreshUserData, setError]);

  return {
    updateProfile,
    uploadProfilePhoto,
    isUpdating,
    isUploading,
    error,
    setError
  };
}