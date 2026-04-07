const mongoose = require('mongoose');

const resumoSchema = new mongoose.Schema({
  data: {
    type: Date,
    required: true,
    default: Date.now
  },
  conteudo: {
    type: String,
    required: [true, 'Conteúdo do resumo é obrigatório'],
    trim: true,
    maxlength: [5000, 'Resumo deve ter no máximo 5000 caracteres']
  },
  paginaInicio: {
    type: Number,
    min: 0
  },
  paginaFim: {
    type: Number,
    min: 0
  },
  ideiasPrincipais: [{
    type: String,
    trim: true,
    maxlength: [500, 'Cada ideia deve ter no máximo 500 caracteres']
  }]
}, { _id: true });

const livroSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título deve ter no máximo 200 caracteres']
  },
  autor: {
    type: String,
    required: [true, 'Autor é obrigatório'],
    trim: true,
    maxlength: [150, 'Autor deve ter no máximo 150 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [2000, 'Descrição deve ter no máximo 2000 caracteres']
  },
  capa: {
    type: String,
    trim: true // URL da imagem da capa
  },
  genero: {
    type: String,
    trim: true,
    maxlength: [100, 'Gênero deve ter no máximo 100 caracteres']
  },
  totalPaginas: {
    type: Number,
    min: [1, 'O livro deve ter pelo menos 1 página'],
    default: 0
  },
  paginaAtual: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['planeado', 'lendo', 'concluido', 'abandonado'],
    default: 'planeado'
  },
  prioridade: {
    type: String,
    enum: ['baixa', 'media', 'alta'],
    default: 'media'
  },
  dataInicio: {
    type: Date
  },
  dataConclusao: {
    type: Date
  },
  nota: {
    type: Number,
    min: 0,
    max: 5, // Avaliação de 0 a 5 estrelas
    default: 0
  },
  resumoGeral: {
    type: String,
    trim: true,
    maxlength: [5000, 'Resumo geral deve ter no máximo 5000 caracteres']
  },
  resumosDiarios: [resumoSchema],
  citacoesFavoritas: [{
    type: String,
    trim: true,
    maxlength: [1000, 'Citação deve ter no máximo 1000 caracteres']
  }],
  aprendizados: [{
    type: String,
    trim: true,
    maxlength: [500, 'Aprendizado deve ter no máximo 500 caracteres']
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag deve ter no máximo 50 caracteres']
  }],
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Índices para busca eficiente
livroSchema.index({ usuario: 1, status: 1 });
livroSchema.index({ usuario: 1, titulo: 'text', autor: 'text' });
livroSchema.index({ usuario: 1, createdAt: -1 });

// Virtual para calcular progresso de leitura
livroSchema.virtual('progresso').get(function() {
  if (this.totalPaginas > 0 && this.paginaAtual >= 0) {
    return Math.min(100, Math.round((this.paginaAtual / this.totalPaginas) * 100));
  }
  return 0;
});

// Garantir que virtuals sejam incluídos em JSON
livroSchema.set('toJSON', { virtuals: true });
livroSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Livro', livroSchema);
