import type { UserProfile } from '../types/user';

export async function getGeminiResponse(
  prompt: string,
  userProfile: UserProfile
): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error('Serviço temporariamente indisponível. Por favor, tente novamente mais tarde.');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Changed to a cheaper model
        messages: [
          {
            role: 'system',
            content: `Você é uma nutricionista profissional.
            
            IMPORTANTE:
            - NUNCA se refira a si mesma como assistente, IA, ou qualquer termo relacionado
            - SEMPRE mantenha o papel de nutricionista profissional
            - Use linguagem natural e profissional
            - Evite termos como "posso ajudar", "estou aqui para ajudar", etc
            - Prefira respostas diretas e objetivas`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300 // Reduced token usage
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao obter resposta');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Resposta vazia do modelo');
    }

    return content;
  } catch (error) {
    console.error('Erro ao obter resposta:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Serviço temporariamente indisponível');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Muitas solicitações. Aguarde um momento.');
      }
      throw error;
    }
    
    throw new Error('Erro ao processar sua mensagem. Por favor, tente novamente.');
  }
}