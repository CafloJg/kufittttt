# Instruções para gerar o arquivo AAB (Android App Bundle)

Este documento descreve como gerar um arquivo AAB para o aplicativo KiiFit.

## Pré-requisitos

1. JDK 11 ou superior (atualmente você tem o JDK 8)
2. Android SDK instalado e configurado
3. Gradle

## Como instalar o JDK 11 ou superior

### Opção 1: Instalar o OpenJDK
1. Baixe o OpenJDK 11 ou superior em: https://adoptium.net/temurin/releases/
2. Instale seguindo as instruções na tela
3. Configure a variável de ambiente JAVA_HOME para apontar para a instalação do JDK

### Opção 2: Instalar o Oracle JDK
1. Baixe o Oracle JDK 11 ou superior em: https://www.oracle.com/java/technologies/javase-downloads.html
2. Instale seguindo as instruções na tela
3. Configure a variável de ambiente JAVA_HOME para apontar para a instalação do JDK

## Passos para gerar o arquivo AAB

Após instalar o JDK 11 ou superior, siga estes passos:

1. Abra um terminal e navegue até a pasta do projeto:
   ```
   cd C:\Users\João\Downloads\project
   ```

2. Certifique-se de que o projeto web está construído:
   ```
   npm run build
   ```

3. Atualize os recursos do Android com os arquivos web mais recentes:
   ```
   npx cap sync android
   ```

4. Navegue até a pasta do Android:
   ```
   cd android
   ```

5. Gere o arquivo AAB usando o Gradle:
   ```
   .\gradlew.bat bundleRelease
   ```

6. Se tudo correr bem, o arquivo AAB estará disponível em:
   ```
   app/build/outputs/bundle/release/app-release.aab
   ```

## Problemas comuns

- Se você receber erros relacionados à versão do JDK, certifique-se de que está usando o JDK 11 ou superior.
- Se você receber erros relacionados ao Android SDK, certifique-se de que o Android SDK está instalado e configurado corretamente.

## Assinando o AAB

Para publicar na Google Play Store, você precisa assinar o AAB com uma chave de assinatura. Você pode seguir as instruções em: https://developer.android.com/studio/publish/app-signing

## Recursos adicionais

- [Documentação do Capacitor para Android](https://capacitorjs.com/docs/android)
- [Documentação do Android App Bundle](https://developer.android.com/guide/app-bundle) 