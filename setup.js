#!/usr/bin/env node

/**
 * Script de configuração do ambiente SIKU
 * Executa verificações e configurações básicas
 */

const fs = require('fs');
const path = require('path');

console.log('🌅 Configurando ambiente SIKU...\n');

// Verificar se .env existe no backend
const backendEnvPath = path.join(__dirname, '.env');
const backendEnvExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(backendEnvPath)) {
  if (fs.existsSync(backendEnvExamplePath)) {
    console.log('📋 Copiando .env.example para .env no backend...');
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    console.log('✅ Arquivo .env criado no backend');
    console.log('⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações reais!\n');
  } else {
    console.log('❌ Arquivo .env.example não encontrado no backend');
  }
} else {
  console.log('✅ Arquivo .env já existe no backend');
}

// Verificar se .env existe no mobile
const mobileEnvPath = path.join(__dirname, '..', 'mobile', '.env');
const mobileEnvExamplePath = path.join(__dirname, '..', 'mobile', '.env.example');

if (!fs.existsSync(mobileEnvPath)) {
  if (fs.existsSync(mobileEnvExamplePath)) {
    console.log('📋 Copiando .env.example para .env no mobile...');
    fs.copyFileSync(mobileEnvExamplePath, mobileEnvPath);
    console.log('✅ Arquivo .env criado no mobile');
    console.log('⚠️  IMPORTANTE: Configure o IP do backend no arquivo mobile/.env!\n');
  } else {
    console.log('❌ Arquivo .env.example não encontrado no mobile');
  }
} else {
  console.log('✅ Arquivo .env já existe no mobile');
}

console.log('\n🔧 PRÓXIMOS PASSOS:');
console.log('1. Configure o MongoDB no backend/.env');
console.log('2. Configure o IP do backend no mobile/.env');
console.log('3. Execute: npm install (em ambas as pastas)');
console.log('4. Execute: npm start (backend) e npx expo start (mobile)');
console.log('\nPara descobrir seu IP:');
console.log('- Windows: ipconfig');
console.log('- Mac/Linux: ifconfig ou ip addr');
console.log('- Procure por IPv4 Address\n');

console.log('🎉 Configuração concluída!');