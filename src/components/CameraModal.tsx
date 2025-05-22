import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowLeft, Camera as CameraIcon, Plus, Check } from 'lucide-react';
import Webcam from 'react-webcam';

// Verificar se estamos em produção ou desenvolvimento
const isProduction = import.meta.env.PROD;
const API_URL = isProduction ? '/api/gemini-vision' : 'http://localhost:3002/api/gemini-vision';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal?: (meal: { 
    name: string, 
    nutrition: { 
      kcal: number, 
      protein: number, 
      carbs: number, 
      fat: number 
    } 
  }) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onAddMeal }) => {
  const [flash, setFlash] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [result, setResult] = useState<null | { label: string; nutrition: any }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealAdded, setMealAdded] = useState(false);

  const capture = () => {
    if (webcamRef.current) {
      const image = webcamRef.current.getScreenshot();
      setImageSrc(image);
      setResult(null);
      setError(null);
      setMealAdded(false);
      setTimeout(() => analyzeWithGPT(image), 100); // Pequeno delay para garantir renderização
    }
  };

  const retake = () => {
    setImageSrc(null);
    setResult(null);
    setError(null);
    setMealAdded(false);
  };
  
  const handleAddMeal = () => {
    if (result && onAddMeal) {
      onAddMeal({
        name: result.label,
        nutrition: result.nutrition
      });
      setMealAdded(true);
    }
  };

  async function analyzeWithGPT(image: string | null) {
    if (!image) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setMealAdded(false);
    try {
      // Usar a URL correta dependendo do ambiente
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });

      if (!response.ok) {
        const errorData = await response.text();
        setError(errorData || 'Erro ao contatar o servidor de análise.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Log da resposta completa para depuração
      console.log('Resposta completa da API:', data);
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        setError('A resposta da IA não contém conteúdo textual.');
        setLoading(false);
        return;
      }
      
      console.log('Texto da resposta:', content);
      
      let json;
      try {
        // Várias tentativas de extrair o JSON
        if (content.includes('{') && content.includes('}')) {
          // Método 1: Extrair JSON de blocos de código markdown
          const markdownMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (markdownMatch && markdownMatch[1]) {
            console.log('Método 1 (markdown): Encontrou JSON');
            json = JSON.parse(markdownMatch[1].trim());
          } 
          // Método 2: Extrair JSON diretamente do texto
          else {
            const jsonMatch = content.match(/(\{[\s\S]*?\})/);
            if (jsonMatch && jsonMatch[1]) {
              console.log('Método 2 (regex): Encontrou JSON');
              json = JSON.parse(jsonMatch[1].trim());
            }
          }
        }
        
        // Se os métodos anteriores falharem, tenta último recurso
        if (!json) {
          // Verificar se o conteúdo inteiro já é um JSON válido
          try {
            console.log('Método 3 (direto): Tentando parsear o conteúdo completo');
            json = JSON.parse(content.trim());
          } catch (e) {
            console.error('Falha ao parsear o conteúdo como JSON');
          }
        }
        
        // Se ainda não conseguiu um JSON válido
        if (!json) {
          throw new Error('Não foi possível extrair um JSON válido da resposta');
        }
        
        console.log('JSON extraído:', json);
      } catch (e) {
        console.error("Erro ao interpretar JSON da IA:", e);
        console.error("Conteúdo da resposta:", content);
        setError('Não foi possível interpretar a resposta da IA. Tente novamente.');
        setLoading(false);
        return;
      }

      // Normalizar os nomes dos campos para aceitar diferentes formatos
      const normalizedJson = {
        alimento: json.alimento || json.nome || json.food || json.item || '',
        kcal: json.kcal || json.calorias || json.calories || json.kcal_total || 0,
        proteina: json.proteina || json.proteinas || json.protein || json.proteins || 0,
        carboidrato: json.carboidrato || json.carboidratos || json.carb || json.carbs || 0,
        gordura: json.gordura || json.gorduras || json.fat || json.fats || 0
      };
      
      console.log('JSON normalizado:', normalizedJson);

      if (normalizedJson.alimento) {
        setResult({
          label: normalizedJson.alimento,
          nutrition: {
            kcal: normalizedJson.kcal,
            protein: normalizedJson.proteina,
            carbs: normalizedJson.carboidrato,
            fat: normalizedJson.gordura
          }
        });
      } else {
        setError('Não foi possível identificar o alimento na resposta da IA. Tente tirar outra foto com melhor iluminação.');
      }
    } catch (e) {
      console.error("Erro ao chamar o serviço de análise:", e);
      setError(isProduction 
        ? 'Erro de conexão com o serviço de análise. Tente novamente mais tarde.' 
        : 'Erro de conexão com o servidor de análise. Verifique se o backend está rodando na porta 3002.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-gray-50 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-0"
            style={{ width: '95vw', maxWidth: 400, height: '80vh', maxHeight: '540px' }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 w-full flex items-center justify-between px-4 py-3 z-10">
              <button onClick={onClose} className="bg-white/80 rounded-full p-2 shadow">
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              <span className="text-base font-semibold text-gray-700">Analisar Refeição</span>
              <button onClick={() => setFlash(f => !f)} className="bg-white/80 rounded-full p-2 shadow">
                <Zap size={24} className={flash ? 'text-yellow-400' : 'text-gray-700'} />
              </button>
            </div>
            {/* Área de foco */}
            <div className="flex-1 flex flex-col items-center justify-center w-full pt-4 pb-4">
              <div className="relative w-11/12 max-w-xs aspect-square flex items-center justify-center">
                {imageSrc ? (
                  <img src={imageSrc} alt="captura" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Webcam
                    ref={webcamRef}
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'environment' }}
                  />
                )}
                <div className="absolute inset-0 rounded-2xl border-4 border-white/90 pointer-events-none" style={{ boxShadow: '0 0 0 4px #fff8' }} />
              </div>
              {/* Botão de captura */}
              <div className="flex justify-center mt-8">
                {imageSrc ? (
                  <button onClick={retake} className="bg-gray-200 text-gray-700 rounded-full px-6 py-2 font-semibold shadow hover:bg-gray-300 transition">
                    Tirar outra foto
                  </button>
                ) : (
                  <button onClick={capture} className="bg-pink-500 text-white rounded-full p-4 shadow-lg hover:bg-pink-600 transition flex items-center justify-center">
                    <CameraIcon size={28} />
                  </button>
                )}
              </div>
            </div>
            {/* Card de resultado */}
            <div className="w-full px-6 pb-12">
              {loading && (
                <div className="w-full flex justify-center items-center py-4">
                  <span className="text-pink-500 font-medium">Analisando alimento com IA...</span>
                </div>
              )}
              {error && (
                <div className="w-full flex justify-center items-center py-4">
                  <span className="text-red-500 font-medium">{error}</span>
                </div>
              )}
              {result && (
                <div className="w-full bg-white rounded-2xl shadow-lg p-5 flex flex-col items-center">
                  <span className="text-xl font-bold text-gray-800 mb-3 capitalize">{result.label}</span>
                  {result.nutrition ? (
                    <>
                      <div className="w-full grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-gray-700">{result.nutrition.kcal}</span>
                          <span className="text-sm text-gray-500">calorias</span>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-blue-500">{result.nutrition.protein}g</span>
                          <span className="text-sm text-gray-500">proteínas</span>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-orange-500">{result.nutrition.carbs}g</span>
                          <span className="text-sm text-gray-500">carboidratos</span>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-purple-500">{result.nutrition.fat}g</span>
                          <span className="text-sm text-gray-500">gorduras</span>
                        </div>
                      </div>
                      
                      {/* Botão de adicionar refeição */}
                      <button 
                        onClick={handleAddMeal}
                        disabled={mealAdded}
                        className={`mt-4 py-3 px-6 rounded-xl font-semibold flex items-center justify-center w-full transition-all ${
                          mealAdded 
                            ? "bg-green-100 text-green-700" 
                            : "bg-pink-500 text-white hover:bg-pink-600"
                        }`}
                      >
                        {mealAdded ? (
                          <>
                            <Check size={20} className="mr-2" />
                            Adicionado
                          </>
                        ) : (
                          <>
                            <Plus size={20} className="mr-2" />
                            Adicionar Refeição
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm mt-2">Sem dados nutricionais cadastrados.</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CameraModal; 