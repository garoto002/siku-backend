// Marcar projeto como cumprido
exports.marcarCumprido = async (req, res) => {
  try {
    const { id } = req.params;
    const projeto = await Projeto.findOne({ _id: id, usuario: req.usuario.id });
    if (!projeto) return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
    projeto.cumprido = true;
    await projeto.save();
    res.status(200).json({ success: true, message: 'Projeto marcado como cumprido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao marcar como cumprido', error: error.message });
  }
};
const Projeto = require('../models/Projeto');

// Obter um projeto específico
exports.obterProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const projeto = await Projeto.findOne({ _id: id, usuario: req.usuario.id });
    if (!projeto) return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
    res.status(200).json({ success: true, data: projeto });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter projeto', error: error.message });
  }
};

// Listar todos os projetos do usuário
exports.listarProjetos = async (req, res) => {
  try {
    const projetos = await Projeto.find({ usuario: req.usuario.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: projetos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao listar projetos', error: error.message });
  }
};

// Criar novo projeto
exports.criarProjeto = async (req, res) => {
  try {
    const { titulo, descricao, dataProjecto } = req.body;
    if (!titulo) return res.status(400).json({ success: false, message: 'Título é obrigatório' });
    const projeto = await Projeto.create({ titulo, descricao, dataProjecto, usuario: req.usuario.id });
    res.status(201).json({ success: true, data: projeto });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar projeto', error: error.message });
  }
};

// Atualizar projeto
exports.atualizarProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, dataProjecto } = req.body;
    if (!titulo) return res.status(400).json({ success: false, message: 'Título é obrigatório' });
    const projeto = await Projeto.findOneAndUpdate(
      { _id: id, usuario: req.usuario.id },
      { titulo, descricao, dataProjecto },
      { new: true }
    );
    if (!projeto) return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
    res.status(200).json({ success: true, data: projeto });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar projeto', error: error.message });
  }
};

// Excluir projeto
exports.excluirProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const projeto = await Projeto.findOneAndDelete({ _id: id, usuario: req.usuario.id });
    if (!projeto) return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
    res.status(200).json({ success: true, message: 'Projeto excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir projeto', error: error.message });
  }
};
