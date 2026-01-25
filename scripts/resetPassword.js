const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

const User = require('../models/User');

async function resetPassword(email, novaSenha) {
  try {
    const usuario = await User.findOne({ email });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    console.log('👤 Usuário encontrado:', usuario.nome);
    
    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 12);
    
    // Atualizar diretamente no banco (sem trigger do middleware)
    await User.updateOne(
      { email },
      { $set: { senha: senhaHash } }
    );
    
    console.log('✅ Senha resetada com sucesso!');
    console.log('📧 Email:', email);
    console.log('🔑 Nova senha:', novaSenha);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

// Usar argumentos da linha de comando ou valores padrão
const email = process.argv[2] || 'artesdeseducaorainhama@gmail.com';
const novaSenha = process.argv[3] || '12345678';

resetPassword(email, novaSenha);
