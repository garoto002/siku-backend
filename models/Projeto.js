const mongoose = require('mongoose');

const ProjetoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descricao: { type: String },
  dataProjecto: { type: String },
  cumprido: { type: Boolean, default: false },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Projeto', ProjetoSchema);
