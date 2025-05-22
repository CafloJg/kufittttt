// Otimizações de performance para o KiiFit App

import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Função para criar componentes com carregamento lazy
export const createLazyComponent = (importFunc, fallback = null, errorFallback = null) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <ErrorBoundary fallback={errorFallback || <div>Erro ao carregar o componente</div>}>
      <Suspense fallback={fallback || <div>Carregando...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Otimizador de carregamento de modelos TensorFlow
export const optimizeTensorflowModel = async (modelPath, options = {}) => {
  try {
    const tf = await import('@tensorflow/tfjs');
    
    // Configurar flags de otimização
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    tf.env().set('WEBGL_PACK', true);
    tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);
    
    // Carregar modelo com opções de otimização
    const model = await tf.loadGraphModel(modelPath, {
      fromTFHub: options.fromTFHub || false,
      weightLoaderFn: options.weightLoaderFn,
    });
    
    // Pré-aquecer o modelo com dados fictícios para melhorar o primeiro tempo de inferência
    if (options.warmup) {
      const inputShape = options.inputShape || [1, 224, 224, 3];
      const dummyInput = tf.zeros(inputShape);
      model.predict(dummyInput);
      dummyInput.dispose();
    }
    
    return model;
  } catch (error) {
    console.error('Erro ao otimizar modelo TensorFlow:', error);
    throw error;
  }
};

// Otimizador de imagens para processamento
export const optimizeImageForProcessing = async (imageElement, targetSize = 224) => {
  try {
    const tf = await import('@tensorflow/tfjs');
    
    // Converter imagem para tensor
    const imageTensor = tf.browser.fromPixels(imageElement);
    
    // Redimensionar para o tamanho alvo
    const resized = tf.image.resizeBilinear(imageTensor, [targetSize, targetSize]);
    
    // Normalizar valores de pixel para [-1, 1]
    const normalized = resized.toFloat().div(tf.scalar(127.5)).sub(tf.scalar(1));
    
    // Expandir dimensões para incluir batch
    const batched = normalized.expandDims(0);
    
    // Limpar tensores intermediários
    imageTensor.dispose();
    resized.dispose();
    normalized.dispose();
    
    return batched;
  } catch (error) {
    console.error('Erro ao otimizar imagem para processamento:', error);
    throw error;
  }
};

// Gerenciador de cache para resultados de inferência
export class InferenceCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remover a entrada mais antiga
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Exportar cache global para uso em todo o aplicativo
export const globalInferenceCache = new InferenceCache();

// Otimizador de renderização para listas longas
export const createVirtualizedList = (Component, options = {}) => {
  return (props) => {
    const { useVirtual } = require('@tanstack/react-virtual');
    const { useRef } = require('react');
    
    const parentRef = useRef(null);
    
    const rowVirtualizer = useVirtual({
      size: props.items.length,
      parentRef,
      estimateSize: options.estimateSize || (() => 50),
      overscan: options.overscan || 5,
    });
    
    return (
      <Component
        {...props}
        parentRef={parentRef}
        virtualizer={rowVirtualizer}
      />
    );
  };
};