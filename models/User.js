const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [50, 'Nome deve ter no máximo 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email inválido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Não retorna a senha por padrão nas consultas
  },
  // ...existing code...
  foto: {
    type: String,
    default: ''
  },
  ativo: {
    type: Boolean,
    default: true
  },
  dataRegistro: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function() {
  const user = this;
  
  // Só faz hash se a senha foi modificada
  if (!user.isModified('senha')) {
    return;
  }
  
  // Hash da senha com custo 12
  try {
    const hashedPassword = await bcrypt.hash(user.senha, 12);
    user.senha = hashedPassword;
  } catch (error) {
    throw error;
  }
});

// Método para verificar senha
userSchema.methods.verificarSenha = async function(senhaCandidata) {
  return await bcrypt.compare(senhaCandidata, this.senha);
};

// Método para remover dados sensíveis do output
userSchema.methods.toJSON = function() {
  const usuario = this.toObject();
  delete usuario.senha;
  return usuario;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

module.exports = User;