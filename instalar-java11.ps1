# Script para baixar e configurar Java 11 temporariamente
# Autor: Claude AI
# Data: 10/04/2025

Write-Host "Iniciando a instalação temporária do Java 11..." -ForegroundColor Green

# Criar pasta para o Java 11
$javaPath = "C:\Java11"
if (-not (Test-Path $javaPath)) {
    Write-Host "Criando diretório $javaPath..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $javaPath -Force | Out-Null
}

# URL do OpenJDK 11
$jdkUrl = "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_windows_hotspot_11.0.21_9.zip"
$zipFile = "$javaPath\openjdk11.zip"

# Baixar o OpenJDK 11
Write-Host "Baixando OpenJDK 11..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $jdkUrl -OutFile $zipFile
} catch {
    Write-Host "Erro ao baixar OpenJDK 11: $_" -ForegroundColor Red
    Write-Host "Por favor, baixe manualmente de: https://adoptium.net/temurin/releases/?version=11" -ForegroundColor Red
    exit 1
}

# Extrair o arquivo ZIP
Write-Host "Extraindo arquivo ZIP..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipFile -DestinationPath $javaPath -Force
    Remove-Item $zipFile -Force
} catch {
    Write-Host "Erro ao extrair arquivo: $_" -ForegroundColor Red
    exit 1
}

# Encontrar o diretório do JDK
$jdkDir = Get-ChildItem -Path $javaPath -Directory | Where-Object { $_.Name -like "jdk*" } | Select-Object -First 1
if ($null -eq $jdkDir) {
    Write-Host "Não foi possível encontrar o diretório do JDK após a extração." -ForegroundColor Red
    exit 1
}

$jdkPath = $jdkDir.FullName
Write-Host "Java 11 extraído para: $jdkPath" -ForegroundColor Green

# Configurar variáveis de ambiente para esta sessão
$env:JAVA_HOME = $jdkPath
$env:PATH = "$jdkPath\bin;$env:PATH"

# Verificar a instalação
Write-Host "Verificando a instalação do Java 11..." -ForegroundColor Yellow
try {
    $javaVersion = & "$jdkPath\bin\java" -version 2>&1
    if ($javaVersion -match "version `"11") {
        Write-Host "Java 11 configurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Java 11 não foi configurado corretamente." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Erro ao verificar a versão do Java: $_" -ForegroundColor Red
    exit 1
}

# Instruções para gerar AAB
Write-Host "`nPara gerar o arquivo AAB, execute os seguintes comandos nesta mesma janela do PowerShell:" -ForegroundColor Cyan
Write-Host "cd C:\Users\João\Downloads\project" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor White
Write-Host "npx cap sync android" -ForegroundColor White
Write-Host "cd android" -ForegroundColor White
Write-Host ".\gradlew.bat bundleRelease" -ForegroundColor White
Write-Host "`nO arquivo AAB estará em: app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Cyan

# Nota importante
Write-Host "`nIMPORTANTE: Esta configuração do Java 11 é temporária e válida apenas para esta sessão do PowerShell." -ForegroundColor Yellow
Write-Host "Seu Java 8 original continuará sendo a versão padrão do sistema." -ForegroundColor Yellow 