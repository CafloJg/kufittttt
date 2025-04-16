import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

function Admin() {

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-4">Painel de Administração</h1>
          <p className="text-gray-600 mb-6">Funcionalidade de geração de imagens de alimentos foi removida para reduzir chamadas de API.</p>
          
          <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-500 mt-1" size={20} />
            <div>
              <p className="font-medium text-blue-700">Informação</p>
              <p className="text-blue-600 mt-1">O aplicativo agora usa imagens estáticas pré-definidas para refeições e alimentos, melhorando a performance e reduzindo custos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;