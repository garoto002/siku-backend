const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome da categoria é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [50, 'Nome deve ter no máximo 50 caracteres']
  },
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: [true, 'Área é obrigatória']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  cor: {
    type: String,
    default: '#10B981' // Cor padrão verde
  }
}, {
  timestamps: true
});

// Índice composto para garantir que uma área não tenha categorias com nomes duplicados
categoriaSchema.index({ nome: 1, area: 1 }, { unique: true });

module.exports = mongoose.model('Categoria', categoriaSchema);