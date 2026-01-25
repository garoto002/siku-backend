const mongoose = require('mongoose');

const atividadeSchema = new mongoose.Schema({
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
  horaInicio: {
    type: String,
    trim: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora deve ser HH:MM']
  },
  horaFim: {
    type: String,
    trim: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora deve ser HH:MM']
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
  categoria: {
    type: String,
    trim: true,
    default: 'Geral'
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  lembretes: [{
    tipo: {
      type: String,
      enum: ['notificacao', 'email'],
      default: 'notificacao'
    },
    tempoAntes: {
      type: Number, // minutos antes da atividade
      default: 15
    },
    ativo: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Índices para melhor performance
atividadeSchema.index({ usuario: 1, data: 1 });
atividadeSchema.index({ usuario: 1, status: 1 });

// Método para verificar se a atividade está atrasada
atividadeSchema.methods.estaAtrasada = function() {
  return this.status !== 'concluida' && this.status !== 'cancelada' &&
         new Date() > new Date(this.data);
};

// Método para calcular tempo restante
atividadeSchema.methods.tempoRestante = function() {
  const agora = new Date();
  const dataAtividade = new Date(this.data);
  const diffMs = dataAtividade - agora;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    horas: diffHrs,
    minutos: diffMins,
    totalMinutos: Math.floor(diffMs / (1000 * 60))
  };
};

const Atividade = mongoose.model('Atividade', atividadeSchema);

module.exports = Atividade;