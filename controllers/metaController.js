const Meta = require('../models/Meta');

// Listar todas as metas do usuário
exports.listarMetas = async (req, res) => {
  try {
    const metas = await Meta.find({ usuario: req.usuario.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: metas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao listar metas', error: error.message });
  }
};

// Criar nova meta
exports.criarMeta = async (req, res) => {
  try {
    const { titulo, descricao, dataInicio, dataFim, prioridade } = req.body;
    if (!titulo || !dataInicio || !dataFim) {
      return res.status(400).json({ success: false, message: 'Título, data de início e data de fim são obrigatórios' });
    }

    const meta = await Meta.create({
      titulo,
      descricao,
      dataInicio,
      dataFim,
      prioridade,
      usuario: req.usuario.id
    });
    res.status(201).json({ success: true, data: meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar meta', error: error.message });
  }
};

// Atualizar meta
exports.atualizarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, dataInicio, dataFim, status, prioridade } = req.body;

    const meta = await Meta.findOneAndUpdate(
      { _id: id, usuario: req.usuario.id },
      { titulo, descricao, dataInicio, dataFim, status, prioridade },
      { new: true }
    );

    if (!meta) return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    res.status(200).json({ success: true, data: meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar meta', error: error.message });
  }
};

// Excluir meta
exports.excluirMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await Meta.findOneAndDelete({ _id: id, usuario: req.usuario.id });
    if (!meta) return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    res.status(200).json({ success: true, message: 'Meta excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir meta', error: error.message });
  }
};

// Marcar meta como concluída
exports.marcarConcluida = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await Meta.findOne({ _id: id, usuario: req.usuario.id });
    if (!meta) return res.status(404).json({ success: false, message: 'Meta não encontrada' });

    meta.status = meta.status === 'concluida' ? 'pendente' : 'concluida';
    await meta.save();
    res.status(200).json({ success: true, message: 'Status da meta atualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar status da meta', error: error.message });
  }
};