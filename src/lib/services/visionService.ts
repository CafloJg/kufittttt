import { GoogleGenerativeAI } from '@google/generative-ai';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { FoodImageAnalysis } from '../../types/image';

export class VisionService {
  private static instance: VisionService;
  private readonly genAI: GoogleGenerativeAI;
  private mobilenetModel: any;
  private cocoModel: any;
  private isInitialized = false;

  private constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);
  }

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
      console.error('Error initializing vision models:', error);
      throw new Error('Failed to initialize vision service');
    }
  }

  async analyzeFoodImage(imageData: string): Promise<FoodImageAnalysis> {
    await this.initialize();

    try {
      // Convert base64 to image element
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });

      // Run through MobileNet for food classification
      const tfImg = tf.browser.fromPixels(img);
      const mobilenetResults = await this.mobilenetModel.classify(tfImg);

      // Run through COCO-SSD for object detection
      const cocoResults = await this.cocoModel.detect(img);

      // Use Gemini Vision for detailed analysis
      const geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      const result = await geminiModel.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData.split(',')[1]
          }
        },
        {
          text: `Analyze this food image and return a JSON with:
            1. Foods detected with confidence scores
            2. Estimated nutritional information
            3. Portion sizes
            4. Image quality assessment`
        }
      ]);

      const geminiAnalysis = JSON.parse(result.response.text());

      // Combine all results
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

      // Add bounding boxes from COCO-SSD
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
      console.error('Error analyzing food image:', error);
      throw new Error('Failed to analyze food image');
    }
  }
}