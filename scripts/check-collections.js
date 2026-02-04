require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  
  // Contar documentos
  const habitos = await db.collection('habitos').countDocuments();
  const gastos = await db.collection('gastos').countDocuments();
  
  console.log('=== TOTAL DE DOCUMENTOS ===');
  console.log('Coleção habitos:', habitos);
  console.log('Coleção gastos:', gastos);
  
  // Ver documentos de hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const habitosHoje = await db.collection('habitos').find({
    data: { $gte: hoje }
  }).toArray();
  
  const gastosHoje = await db.collection('gastos').find({
    data: { $gte: hoje }
  }).toArray();
  
  console.log('\n=== DOCUMENTOS DE HOJE (4 Fev 2026) ===');
  console.log('Habitos de hoje:', habitosHoje.length);
  console.log('Gastos de hoje:', gastosHoje.length);
  
  if (habitosHoje.length > 0) {
    console.log('\nExemplo de habito de hoje:');
    console.log(JSON.stringify(habitosHoje[0], null, 2));
  }
  
  if (gastosHoje.length > 0) {
    console.log('\nExemplo de gasto de hoje:');
    console.log(JSON.stringify(gastosHoje[0], null, 2));
  }
  
  await mongoose.disconnect();
}

check();
