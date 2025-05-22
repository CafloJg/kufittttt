const express = require('express');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Carregue as credenciais do service account
const credentials = JSON.parse(fs.readFileSync('google-service-account.json', 'utf8'));

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

app.post('/api/gemini-vision', async (req, res) => {
  const { image } = req.body; // base64 com prefixo data:image/jpeg;base64,
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Identifique o alimento nesta imagem e, se possível, informe calorias, proteínas, carboidratos e gorduras por porção. Responda em JSON no formato: { \"alimento\": \"nome\", \"kcal\": 0, \"proteina\": 0, \"carboidrato\": 0, \"gordura\": 0 }." },
              { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao consultar a Gemini API' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Backend Gemini rodando na porta ${PORT}`));
