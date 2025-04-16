import { collection } from 'firebase/firestore';
import { db } from '../firebase';

// Re-export all Firebase utilities
export * from './food';
export * from './goals';
export * from './subscriptions';

// Export collection references
export const foodImageRequestsCollection = collection(db, 'food_image_requests');

// Adicionar registro de erros de inicialização
try {
  console.log('Inicializando Firebase...');
  // ... existing code ...
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
  // Adicione um fallback ou mecanismo de recuperação se necessário
}