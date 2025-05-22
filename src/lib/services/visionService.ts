import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { FoodImageAnalysis } from '../../types/image';
import { analyzeImageWithGemini } from '../api/gemini-vision';

export class VisionService {
  private static instance: VisionService;
  private mobilenetModel: any;
  private cocoModel: any;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): VisionService {
    if (!this.instance) {
      this.instance = new VisionService();
    }
    return this.instance;
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      await tf.ready();
      this.mobilenetModel = await mobilenet.load();
      this.cocoModel = await cocoSsd.load();
      this.isInitialized = true;
    } catch (error) {
      console.error('Erro ao inicializar modelos de visão:', error);
      throw new Error('Falha ao inicializar serviço de visão');
    }
  }

  async analyzeFoodImage(imageData: string): Promise<FoodImageAnalysis> {
    await this.initialize();

    try {
      // Converter base64 para elemento de imagem
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });

      // Executar classificação com MobileNet
      const tfImg = tf.browser.fromPixels(img);
      const mobilenetResults = await this.mobilenetModel.classify(tfImg);

      // Executar detecção de objetos com COCO-SSD
      const cocoResults = await this.cocoModel.detect(img);

      // Usar Gemini Vision para análise detalhada
      const geminiAnalysis = await analyzeImageWithGemini(imageData);

      // Combinar todos os resultados
      const analysis: FoodImageAnalysis = {
        foods: mobilenetResults
          .filter((r: any) => r.className.includes('food'))
          .map((r: any) => ({
            name: r.className,
            confidence: r.probability
          })),
        nutritionalInfo: geminiAnalysis.nutritionalInfo,
        portionSize: geminiAnalysis.portionSize,
        quality: {
          score: geminiAnalysis.quality.score,
          issues: geminiAnalysis.quality.issues
        },
        timestamp: new Date().toISOString()
      };

      // Adicionar caixas delimitadoras do COCO-SSD
      cocoResults.forEach((result: any) => {
        const foodItem = analysis.foods.find(f => 
          f.name.toLowerCase().includes(result.class.toLowerCase())
        );
        if (foodItem) {
          foodItem.boundingBox = {
            x: result.bbox[0],
            y: result.bbox[1],
            width: result.bbox[2],
            height: result.bbox[3]
          };
        }
      });

      return analysis;
    } catch (error) {
      console.error('Erro ao analisar imagem de comida:', error);
      throw new Error('Falha ao analisar imagem de comida');
    }
  }
}