import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Scan, Image as ImageIcon } from 'lucide-react';
import Webcam from 'react-webcam';
import { useVisionAnalysis } from '../hooks/useVisionAnalysis';
import type { FoodImageAnalysis } from '../types/image';

interface FoodAnalyzerProps {
  onAnalysis: (result: FoodImageAnalysis) => void;
  onClose: () => void;
}

function FoodAnalyzer({ onAnalysis, onClose }: FoodAnalyzerProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const { mutate: analyzeImage, isLoading } = useVisionAnalysis();

  const handleCapture = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      analyzeImage(imageSrc, {
        onSuccess: (result) => {
          onAnalysis(result);
        }
      });
    }
  }, [analyzeImage, onAnalysis]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result as string;
      setCapturedImage(imageData);
      analyzeImage(imageData, {
        onSuccess: (result) => {
          onAnalysis(result);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center">
                <Camera className="text-primary-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Analisar Alimento</h2>
                <p className="text-sm text-gray-500">
                  Tire uma foto ou faça upload
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-6">
            {showCamera ? (
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
              />
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured food"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500">
                  Escolha uma opção abaixo
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {!isLoading ? (
              <>
                <button
                  onClick={() => setShowCamera(prev => !prev)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                >
                  <Camera size={20} />
                  <span>
                    {showCamera 
                      ? 'Capturar Foto'
                      : capturedImage 
                      ? 'Tirar Nova Foto' 
                      : 'Usar Câmera'
                    }
                  </span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <ImageIcon size={20} />
                  <span>Upload de Imagem</span>
                </button>

                {capturedImage && (
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setShowCamera(false);
                    }}
                    className="w-full p-3 text-gray-600 hover:text-gray-800"
                  >
                    Limpar
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Loader2 size={32} className="animate-spin mx-auto mb-2 text-primary-500" />
                <p className="text-gray-600">Analisando imagem...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodAnalyzer;