export interface ImageResult {
  imageUrl: string;
  thumbnailUrl: string;
  quality?: number;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  attribution?: {
    photographer: string;
    source: string;
    license: string;
  };
}

export interface FoodImageAnalysis {
  foods: {
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  portionSize?: {
    amount: number;
    unit: string;
  };
  quality: {
    score: number;
    issues?: string[];
  };
  timestamp: string;
}