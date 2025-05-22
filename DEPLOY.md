# Instruções para Deploy na Netlify

## Pré-requisitos
1. Conta na Netlify
2. Node.js e npm instalados
3. CLI da Netlify (`npm install -g netlify-cli`)

## Segurança das Credenciais
⚠️ **IMPORTANTE**: As credenciais da Google estão diretamente no código das funções Netlify. Para maior segurança, siga os passos:

1. Acesse o painel da Netlify > Seu site > Site settings > Environment variables
2. Adicione as seguintes variáveis de ambiente:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Coloque o JSON completo da sua chave de serviço
   - `GOOGLE_PROJECT_ID`: O ID do seu projeto no Google Cloud

3. Depois de configurar as variáveis de ambiente, modifique a função `netlify/functions/gemini-vision.js` para usar essas variáveis em vez das credenciais hardcoded.

## Passos para Deploy

1. **Login na Netlify**
   ```bash
   netlify login
   ```

2. **Configurar o projeto (apenas primeira vez)**
   ```bash
   netlify init
   ```
   Siga as instruções para vincular o repositório à sua conta Netlify.

3. **Fazer o deploy**
   ```bash
   npm run deploy
   ```

4. **Verificar o site**
   Após o deploy, a Netlify fornecerá uma URL para acessar seu site, como `https://your-site-name.netlify.app`.

## Testando as Funções Netlify Localmente

Antes de fazer o deploy, você pode testar as funções localmente:

```bash
netlify functions:serve
```

Isso inicia um servidor local em http://localhost:8888 onde você pode testar suas funções.

## Troubleshooting

Se encontrar problemas no deploy:

1. **Erro de conexão com a API**: Verifique se a função Netlify está sendo executada corretamente. Verifique os logs no painel da Netlify.

2. **Erro com credenciais**: Certifique-se de que as variáveis de ambiente estão configuradas corretamente.

3. **Erro 404 em /api/gemini-vision**: Verifique se o arquivo `public/_redirects` está configurado corretamente e se o build está incluindo este arquivo.

## Recursos Adicionais

- [Documentação da Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Documentação da Google AI API](https://ai.google.dev/docs) 