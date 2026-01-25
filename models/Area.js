const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome da área é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [50, 'Nome deve ter no máximo 50 caracteres']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  cor: {
    type: String,
    default: '#3B82F6' // Cor padrão azul
  }
}, {
  timestamps: true
});

// Índice composto para garantir que um usuário não tenha áreas com nomes duplicados
areaSchema.index({ nome: 1, usuario: 1 }, { unique: true });

module.exports = mongoose.model('Area', areaSchema);