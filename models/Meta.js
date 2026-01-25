const mongoose = require('mongoose');

const MetaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descricao: { type: String },
  dataInicio: { type: String, required: true }, // Data de início da semana
  dataFim: { type: String, required: true }, // Data de fim da semana
  status: { type: String, enum: ['pendente', 'em_andamento', 'concluida'], default: 'pendente' },
  prioridade: { type: String, enum: ['baixa', 'media', 'alta'], default: 'media' },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Meta', MetaSchema);