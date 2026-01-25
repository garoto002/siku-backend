const mongoose = require('mongoose');

const habitoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título deve ter no máximo 100 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória']
  },
  hora: {
    type: String,
    trim: true
  },
  prioridade: {
    type: String,
    enum: ['baixa', 'media', 'alta'],
    default: 'media'
  },
  status: {
    type: String,
    enum: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
    default: 'pendente'
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
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Habito', habitoSchema);