import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VisionService } from '../lib/services/visionService';
import type { FoodImageAnalysis } from '../types/image';

export function useVisionAnalysis() {
  const visionService = VisionService.getInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageData: string) => visionService.analyzeFoodImage(imageData),
    onSuccess: (data: FoodImageAnalysis) => {
      // Cache the analysis result
      queryClient.setQueryData(
        ['foodAnalysis', data.timestamp],
        data
      );
    }
  });
}