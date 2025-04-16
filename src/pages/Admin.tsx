import React, { useState } from 'react';
import { downloadAllFoodImages, foodCategories } from '../data/foodImages';
import { Download, Check, AlertCircle } from 'lucide-react';

function Admin() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '' });
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setCompleted([]);

    try {
      await downloadAllFoodImages((current, total, item) => {
        setProgress({ current, total, item });
        setCompleted(prev => [...prev, item]);
      });
    } catch (error) {
      console.error('Error downloading images:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Erro ao baixar imagens'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">Banco de Imagens de Alimentos</h1>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="mb-8 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Download size={20} />
            <span>
              {isDownloading ? 'Baixando...' : 'Baixar Todas as Imagens'}
            </span>
          </button>

          {/* Progress */}
          {isDownloading && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Baixando {progress.item}...
                </span>
                <span className="text-sm font-medium">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-500 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-8">
            {Object.entries(foodCategories).map(([key, category]) => (
              <div key={key}>
                <h2 className="text-xl font-medium mb-4">{category.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {category.items.map(item => (
                    <div
                      key={item.name}
                      className="p-4 bg-gray-50 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-sm">{item.name}</span>
                      {completed.includes(item.name) && (
                        <Check size={16} className="text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin