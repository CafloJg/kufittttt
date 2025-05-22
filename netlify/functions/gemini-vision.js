const { GoogleAuth } = require('google-auth-library');

// Usar variáveis de ambiente da Netlify para as credenciais
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY;

let GOOGLE_PRIVATE_KEY;

if (!GOOGLE_PROJECT_ID) {
  console.error('Variável de ambiente GOOGLE_PROJECT_ID não definida.');
  // Não jogue erro aqui ainda, getAccessToken fará isso
}
if (!GOOGLE_CLIENT_EMAIL) {
  console.error('Variável de ambiente GOOGLE_CLIENT_EMAIL não definida.');
}
if (!GOOGLE_PRIVATE_KEY_RAW) {
  console.error('Variável de ambiente GOOGLE_PRIVATE_KEY não definida.');
} else {
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY_RAW.replace(/\\n/g, '\n');
}

async function getAccessToken() {
  console.log('Tentando obter token de acesso...');
  console.log('GOOGLE_PROJECT_ID:', GOOGLE_PROJECT_ID ? 'Definido' : 'NÃO DEFINIDO');
  console.log('GOOGLE_CLIENT_EMAIL:', GOOGLE_CLIENT_EMAIL ? 'Definido' : 'NÃO DEFINIDO');
  console.log('GOOGLE_PRIVATE_KEY:', GOOGLE_PRIVATE_KEY ? 'Definido (processado a partir de GOOGLE_PRIVATE_KEY_RAW)' : 'NÃO DEFINIDO');

  if (!GOOGLE_PROJECT_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    const missing = [];
    if (!GOOGLE_PROJECT_ID) missing.push('GOOGLE_PROJECT_ID');
    if (!GOOGLE_CLIENT_EMAIL) missing.push('GOOGLE_CLIENT_EMAIL');
    if (!GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY (pode ser devido à ausência de GOOGLE_PRIVATE_KEY_RAW)');
    throw new Error(`Credenciais incompletas. Variáveis de ambiente faltando: ${missing.join(', ')}. Verifique as configurações na Netlify.`);
  }

  try {
  const auth = new GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    projectId: GOOGLE_PROJECT_ID,
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/generative-language'],
  });
    console.log('Instância GoogleAuth criada. Obtendo cliente...');
  const client = await auth.getClient();
    console.log('Cliente GoogleAuth obtido. Obtendo token de acesso...');
  const accessToken = await client.getAccessToken();
    
    if (accessToken && accessToken.token) {
      console.log('Token de acesso obtido com sucesso.');
      // Não logue o token inteiro por segurança, apenas uma confirmação
      // console.log('Token:', accessToken.token.substring(0, 20) + '...'); 
    } else {
      console.error('Falha ao obter token de acesso. Resposta getAccessToken:', accessToken);
      throw new Error('Falha ao obter token de acesso da Google. Resposta vazia ou inválida.');
    }
  return accessToken.token;
  } catch (e) {
    console.error('Erro detalhado em getAccessToken:', e.message, e.stack);
    throw new Error(`Erro ao obter token de acesso da Google: ${e.message}`);
  }
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { image } = JSON.parse(event.body);
    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nenhuma imagem fornecida.' }) };
    }

    const accessToken = await getAccessToken();
    console.log('Token de acesso recebido no handler:', accessToken ? 'Sim' : 'Não');

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    console.log('Fazendo requisição para:', apiUrl);
    console.log('Usando token de acesso (primeiros 20 chars):', accessToken ? accessToken.substring(0, 20) + '...' : 'Nenhum token');
    
    const requestBody = {
        contents: [
          {
            parts: [
              { text: `
Analisar esta imagem de alimento e criar um objeto JSON com as seguintes propriedades:
1. "alimento": nome do prato ou alimento identificado (string)
2. "kcal": valor energético total (número inteiro)
3. "proteina": gramas de proteína (número inteiro)
4. "carboidrato": gramas de carboidratos (número inteiro)
5. "gordura": gramas de gordura (número inteiro)

IMPORTANTE:
- Forneça APENAS um objeto JSON válido, sem texto adicional
- Use valores EXATOS (não aproximados ou intervalos)
- Retorne números inteiros para todos os valores nutricionais
- Se não for possível identificar com precisão, faça a melhor estimativa
- NÃO inclua texto, explicações ou markdown antes ou depois do JSON

Exemplo de resposta (apenas o objeto JSON):
{"alimento":"Frango grelhado com arroz","kcal":450,"proteina":35,"carboidrato":45,"gordura":12}
` },
              { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.1,
          topK: 16,
          maxOutputTokens: 1024,
        }
    };

    // console.log('Corpo da requisição para a API Gemini:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorStatus = response.status;
      const errorStatusText = response.statusText;
      let errorBody = 'N/A';
      try {
        errorBody = await response.text(); // Tenta ler como texto primeiro
      } catch (e) {
        console.warn('Não foi possível ler o corpo do erro como texto.', e);
      }
      
      console.error(`Erro da API Gemini: Status ${errorStatus} (${errorStatusText}). Corpo: ${errorBody}`);
      return { 
        statusCode: errorStatus, 
        body: JSON.stringify({ 
          error: 'Erro da API Gemini.', 
          details: `Status: ${errorStatus} (${errorStatusText}). Response: ${errorBody}` 
        })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (e) {
    console.error('Erro na Netlify Function:', e.message, e.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao processar a imagem.', details: e.message }),
    };
  }
}; 