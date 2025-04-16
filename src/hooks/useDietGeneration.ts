import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../lib/firebase';
import { DietService } from '../lib/services/dietService';
import { useStore } from '../store';
import { useError } from '../context/ErrorContext';
import type { UserProfile, DietPlan } from '../types/user';
import { NetworkStatus } from '../utils/network';
import { formatErrorMessage } from '../utils/errorHandling';

// Function to cancel ongoing generation
let abortControllerRef: AbortController | null = null;

export function useDietGeneration() {
  const [error, setError] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const { setError: setGlobalError } = useError();
  const queryClient = useQueryClient();
  const { setGenerating, setCurrentPlan } = useStore();
  const networkStatus = NetworkStatus.getInstance();

  const mutation = useMutation({
    mutationFn: async (user: UserProfile) => {
      const dietService = DietService.getInstance();
      try {
        if (!auth.currentUser) {
          throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }

        setGenerating(true);

        setGenerationMessage('Iniciando geração do plano alimentar personalizado...');
        
        // Limpar plano atual para garantir que um novo plano seja gerado
        setCurrentPlan(null);
        
        // Check network connectivity first
        if (!networkStatus.isOnline()) {
          throw new Error('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
        }

        if (!user.weight || !user.height || !user.age || !user.gender) {
          throw new Error('Complete seu perfil antes de gerar um plano alimentar.');
        }

        if (!user.goals?.type) {
          throw new Error('Configure suas metas antes de gerar um plano alimentar.');
        }

        if (!user.dietType) {
          throw new Error('Selecione um tipo de dieta no seu perfil.');
        }

        setError(null); 
        setGenerationMessage('Analisando seu perfil e preferências...');
        console.log('Starting diet plan generation...');

        // Check if user has required data
        if (!user.weight || !user.height || !user.age || !user.gender) {
          throw new Error('Complete seu perfil antes de gerar um plano alimentar.');
        }

        if (!user.goals?.type) {
          throw new Error('Configure suas metas antes de gerar um plano alimentar.');
        }

        if (!user.dietType) {
          throw new Error('Selecione um tipo de dieta no seu perfil.');
        }
        
        // Create a new AbortController for this request
        const controller = new AbortController();
        abortControllerRef = controller;
        
        // Set a timeout to handle the case where the API call takes too long
        const timeoutPromise = new Promise<DietPlan>((_, reject) => {
          const timeoutId = setTimeout(() => { 
            controller.abort();
            reject(new Error('O serviço está demorando para responder. Tente novamente em alguns minutos.'));
          }, 180000); // 3 minutos de timeout
          
          // Clean up timeout if promise is aborted
          return () => clearTimeout(timeoutId);
        });
        
        // Race between the actual API call and the timeout
        const plan = await Promise.race([
          dietService.generateMealPlan(user, controller.signal), 
          timeoutPromise
        ]);
        
        if (!plan || !plan.id) {
          throw new Error('Falha ao gerar plano alimentar. Tente novamente.');
        }
        
        console.log('Diet plan generated successfully:', plan.id);
        setGenerationMessage('Plano gerado com sucesso!');
        setCurrentPlan(plan);
        
        // Clear any previous errors
        setTimeout(() => {
          setError(null);
          setGlobalError(null);
        }, 500);
        
        abortControllerRef = null;
        return plan;
      } catch (err) {
        console.error('Error generating diet plan:', err);
        const message = formatErrorMessage(err);
        setError(message);
        setGenerationMessage(null);
        
        // Reporta o erro para o contexto global se for um erro crítico
        if (message.includes('serviço') || message.includes('conexão')) {
          setGlobalError(err, { 
            autoClose: false,
            context: 'Geração de plano alimentar',
            severity: 'error'
          });
        }
        
        throw err;
      } finally {
        setGenerating(false); 
        setTimeout(() => setGenerationMessage(null), 3000);
        abortControllerRef = null;
      }
    },
    onSuccess: (plan: DietPlan) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['diet', 'current', auth.currentUser?.uid] });
      
      // Atualizar o plano no cache diretamente
      queryClient.setQueryData(['diet', 'current', auth.currentUser?.uid], plan);
      
      // Also set the plan in the global store
      setCurrentPlan(plan);
      
      // Forçar atualização do cache para garantir que o novo plano seja exibido
      queryClient.setQueryData(['diet', 'current', auth.currentUser?.uid], plan);
      
      console.log('Diet plan saved to query cache');
    }
  });

  // Function to cancel ongoing generation
  const cancelGeneration = () => {
    if (abortControllerRef) {
      abortControllerRef.abort();
      abortControllerRef = null;
      setGenerating(false); 
      setError('Geração de plano cancelada pelo usuário');
    }
  };

  return {
    generatePlan: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    generationMessage,
    error,
    reset: () => setError(null),
    cancelGeneration,
    isAbortable: !!abortControllerRef
  };
}