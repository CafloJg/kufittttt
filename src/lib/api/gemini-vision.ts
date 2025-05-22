import { GoogleGenerativeAI } from '@google/generative-ai';

export async function analyzeImageWithGemini(imageData: string) {
  try {
    // Chamada para o backend Express que já está configurado
    const response = await fetch('http://localhost:3002/api/gemini-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: imageData })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extrair o conteúdo da resposta do formato da API Gemini
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      try {
        // Tenta extrair o JSON da resposta textual
        return JSON.parse(text);
      } catch {
        // Se não for um JSON válido, retorna o texto como está
        return { 
          rawText: text,
          // Valores padrão para compatibilidade com o restante do código
          nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          portionSize: "desconhecido",
          quality: { score: 0, issues: [] }
        };
      }
    }
    
    return data;
  } catch (error) {
    console.error('Erro na API Gemini Vision:', error);
    throw new Error('Falha ao analisar imagem com Gemini Vision');
  }
} 