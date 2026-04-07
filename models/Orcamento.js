const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    trim: true,
    maxlength: [100, 'Título deve ter no máximo 100 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  tipo: {
    type: String,
    enum: ['mensal', 'semanal'],
    required: [true, 'Tipo é obrigatório'],
    default: 'mensal'
  },
  mes: {
    type: Number,
    min: 1,
    max: 12
  },
  ano: {
    type: Number,
    required: [true, 'Ano é obrigatório']
  },
  semana: {
    type: Number,
    min: 1,
    max: 53
  },
  area: {
    type: String,
    trim: true,
    required: [true, 'Área é obrigatória']
  },
  categoria: {
    type: String,
    trim: true,
    required: [true, 'Categoria é obrigatória']
  },
  valorPlanejado: {
    type: Number,
    required: [true, 'Valor planeado é obrigatório'],
    min: [0, 'Valor deve ser positivo']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

orcamentoSchema.index({ usuario: 1, ano: 1, mes: 1 });
orcamentoSchema.index({ usuario: 1, ano: 1, semana: 1 });

module.exports = mongoose.model('Orcamento', orcamentoSchema);
