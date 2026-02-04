const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['spending_increase', 'large_transaction', 'custom'], required: true },
  title: { type: String, required: true },
  message: { type: String },
  data: { type: Date, default: Date.now },
  meta: { type: Object },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);