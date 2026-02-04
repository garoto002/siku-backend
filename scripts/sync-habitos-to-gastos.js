require('dotenv').config();
const mongoose = require('mongoose');

async function syncHabitosToGastos() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Conectado ao MongoDB.');
    
    const db = mongoose.connection.db;
    
    // Buscar todos os IDs existentes em gastos
    const gastosExistentes = await db.collection('gastos').find({}, { projection: { _id: 1 } }).toArray();
    const idsExistentes = new Set(gastosExistentes.map(g => g._id.toString()));
    
    console.log(`IDs já existentes em gastos: ${idsExistentes.size}`);
    
    // Buscar todos os habitos
    const habitos = await db.collection('habitos').find({}).toArray();
    console.log(`Total de habitos: ${habitos.length}`);
    
    // Filtrar apenas os que não existem em gastos
    const novosDocs = habitos.filter(h => !idsExistentes.has(h._id.toString()));
    console.log(`Novos documentos para inserir: ${novosDocs.length}`);
    
    if (novosDocs.length === 0) {
      console.log('Nenhum documento novo para sincronizar.');
      process.exit(0);
    }
    
    // Inserir os novos
    const result = await db.collection('gastos').insertMany(novosDocs);
    console.log(`✅ ${result.insertedCount} documentos sincronizados com sucesso!`);
    
    // Verificar totais finais
    const totalGastos = await db.collection('gastos').countDocuments();
    console.log(`Total de gastos após sincronização: ${totalGastos}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

syncHabitosToGastos();
