const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      // Configurações de timeout otimizadas
      serverSelectionTimeoutMS: 30000, // 30 segundos para seleção do servidor
      socketTimeoutMS: 45000, // 45 segundos para operações de socket
      maxPoolSize: 10, // Máximo 10 conexões simultâneas
      retryWrites: true
    });
    
    console.log(`🗄️  MongoDB conectado: ${conn.connection.host}`);
    
    // Eventos de conexão para debug
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro de conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB desconectado');
    });
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;