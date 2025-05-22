# Instruções para gerar o arquivo AAB (Android App Bundle)

Para gerar o arquivo AAB (Android App Bundle) para o aplicativo KiiFit, é necessário ter o Java 11 ou superior instalado. Atualmente você tem o Java 8, que não é compatível com as ferramentas modernas do Android.

## Opção 1: Instalar o Java 11 temporariamente (Recomendado)

Para evitar conflitos com seu Java 8 existente, você pode instalar o Java 11 em uma pasta separada:

1. Baixe o OpenJDK 11 em: https://adoptium.net/temurin/releases/
   - Selecione: Windows, x64, JDK, 11 (LTS)
   - Clique em .zip para baixar o arquivo sem instalação

2. Extraia o arquivo ZIP para uma pasta de fácil acesso, por exemplo:
   ```
   C:\Java11
   ```

3. Abra um novo PowerShell e configure temporariamente o Java 11:
   ```powershell
   $env:JAVA_HOME = "C:\Java11\jdk-11.0.19+7"  # Ajuste o caminho conforme necessário
   $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
   ```

4. Verifique se o Java 11 está funcionando:
   ```powershell
   java -version
   ```
   Deve mostrar algo como "openjdk version 11.0.19"

5. Continue com os passos abaixo para gerar o AAB

## Opção 2: Usar o Android Studio (Fácil)

O Android Studio vem com seu próprio JDK e ferramentas para gerar o AAB:

1. Baixe e instale o Android Studio: https://developer.android.com/studio
2. Abra o projeto da pasta `android` usando "File > Open"
3. Espere a sincronização do Gradle (pode demorar alguns minutos)
4. Vá para Build > Build Bundle(s) / APK(s) > Build Bundle(s)

## Passos para gerar o AAB usando Java 11

1. No PowerShell (com Java 11 configurado), navegue até a pasta do projeto:
   ```powershell
   cd C:\Users\João\Downloads\project
   ```

2. Construa o projeto web:
   ```powershell
   npm run build
   ```

3. Sincronize os arquivos com o projeto Android:
   ```powershell
   npx cap sync android
   ```

4. Navegue até a pasta Android:
   ```powershell
   cd android
   ```

5. Execute o build do AAB:
   ```powershell
   .\gradlew.bat bundleRelease
   ```

6. O arquivo AAB estará disponível em:
   ```
   app\build\outputs\bundle\release\app-release.aab
   ```

## Opção 3: Serviço Online para gerar AAB

Se nenhuma das opções acima funcionar, você pode usar serviços online:

1. Compacte a pasta `android` em um arquivo ZIP
2. Use o AppFlow (https://appflow.ionicframework.com/) para enviar e construir o AAB
   - Crie uma conta gratuita
   - Siga as instruções para enviar o projeto e gerar o AAB

## Solução de problemas

Se ainda encontrar problemas:

1. Reinstale o Capacitor com versões específicas:
   ```
   npm uninstall @capacitor/core @capacitor/cli @capacitor/android
   npm install @capacitor/core@4.8.0 @capacitor/cli@4.8.0 @capacitor/android@4.8.0
   ```

2. Execute os comandos:
   ```
   npx cap init KiiFit com.kiifit.app --web-dir dist
   npx cap add android
   npx cap sync android
   ```

3. Tente gerar o AAB com Java 11 conforme as instruções acima 