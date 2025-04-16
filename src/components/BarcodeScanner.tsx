import React, { useState } from 'react';
import { Scan, X, Loader2 } from 'lucide-react';
import BarcodeReader from 'react-barcode-reader';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (data: string) => {
    setIsScanning(false);
    if (data) {
      onScan(data);
    }
  };

  const handleError = (err: any) => {
    console.error('Barcode scanning error:', err);
    setError('Erro ao ler código de barras. Tente novamente.');
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center">
                <Scan className="text-primary-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Scanner de Código</h2>
                <p className="text-sm text-gray-500">
                  Aponte para o código de barras
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

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-6">
            {isScanning ? (
              <div className="relative w-full h-full">
                <BarcodeReader
                  onError={handleError}
                  onScan={handleScan}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-primary-500 rounded-lg animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500">
                  Clique em Iniciar Scanner abaixo
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setIsScanning(prev => !prev)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              {isScanning ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Escaneando...</span>
                </>
              ) : (
                <>
                  <Scan size={20} />
                  <span>Iniciar Scanner</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarcodeScanner;