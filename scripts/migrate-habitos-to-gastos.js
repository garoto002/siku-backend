/**
 * Script de migração: copia documentos da coleção 'habitos' para 'gastos'.
 * Uso: node scripts/migrate-habitos-to-gastos.js
 * Antes de rodar: pare o servidor, faça backup do DB (mongodump) e teste em staging.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Habito = require('../models/Habito');
const Gasto = require('../models/Gasto');

async function migrate() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Conectado ao MongoDB para migração.');

    const habitos = await Habito.find({});
    console.log(`Encontrados ${habitos.length} documentos em 'habitos'.`);

    if (habitos.length === 0) {
      console.log('Nenhum documento para migrar. Encerrando.');
      process.exit(0);
    }

    // Inserir em 'gastos' preservando _id
    const docs = habitos.map(h => {
      const obj = h.toObject();
      delete obj.__v;
      return obj;
    });

    // Inserir em lotes
    const chunkSize = 500;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      await Gasto.insertMany(chunk, { ordered: false });
      console.log(`Inseridos documentos ${i}..${i + chunk.length - 1}`);
    }

    console.log('Migração concluída com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();