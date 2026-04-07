const mongoose = require('mongoose');

const ExercicioSchema = new mongoose.Schema({
  // Meta de exercício
  metaMensal: { type: Number, required: true, default: 20 }, // dias por mês
  metaSemanal: { type: Number, default: 5 }, // dias por semana
  // Dias treinados (array de datas em formato string YYYY-MM-DD)
  diasTreinados: [{ type: String }],
  // Notas opcionais por dia { "2026-04-07": "Treino de pernas" }
  notas: { type: Map, of: String, default: {} },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Index único por usuário - cada usuário tem um único documento de exercício
ExercicioSchema.index({ usuario: 1 }, { unique: true });

module.exports = mongoose.model('Exercicio', ExercicioSchema);
