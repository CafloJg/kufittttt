export function getValidatedApiKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('Chave da API OpenAI não configurada. Verifique as variáveis de ambiente.');
  }
  
  return key.trim();
}

export async function getOpenAIKey(): Promise<string> {
  try {
    const key = getValidatedApiKey();
    if (!key.startsWith('sk-')) {
      throw new Error('Formato de chave API inválido. Verifique a configuração da variável de ambiente.');
    }
    return key;
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    throw new Error('Serviço temporariamente indisponível. Tente novamente mais tarde.');
  }
}