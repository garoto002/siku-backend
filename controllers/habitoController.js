const Habito = require('../models/Habito');

const listarHabitos = async (req, res) => {
  try {
    console.log('🔎 [Habito] Listando hábitos para usuário:', req.usuario?._id || req.usuario?.id || 'não autenticado');
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());

    if (!usuarioId) {
      console.log('❌ [Habito] Usuário não autenticado ao listar hábitos');
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // Suporte a filtros por data (dataInicio, dataFim)
    const { dataInicio, dataFim } = req.query;
    const filtro = { usuario: usuarioId };

    if (dataInicio || dataFim) {
      filtro.data = {};
      if (dataInicio) {
        const start = new Date(dataInicio);
        start.setHours(0, 0, 0, 0);
        filtro.data.$gte = start;
      }
      if (dataFim) {
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);
        filtro.data.$lte = end;
      }
    }

    const habitos = await Habito.find(filtro).sort({ data: 1 });
    res.json({ success: true, habitos });
  } catch (error) {
    console.error('❌ [Habito] Erro ao listar hábitos:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar hábitos', error });
  }
};

const criarHabito = async (req, res) => {
  try {
    console.log('📥 [Habito] Dados recebidos para criar hábito:', req.body);
    console.log('🔑 [Habito] Usuário autenticado:', req.usuario?._id || req.usuario?.id || 'não autenticado');

    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());

    if (!usuarioId) {
      console.log('❌ [Habito] Usuário não autenticado ao criar hábito');
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // Validação dos novos campos obrigatórios
    if (!req.body.area || !req.body.categoria || typeof req.body.valor === 'undefined') {
      return res.status(400).json({ success: false, message: 'Área, categoria e valor são obrigatórios' });
    }
    const novoHabito = new Habito({ ...req.body, usuario: usuarioId });
    await novoHabito.save();
    console.log('✅ [Habito] Hábito salvo com sucesso:', novoHabito);
    res.json({ success: true, habito: novoHabito });
  } catch (error) {
    console.error('❌ [Habito] Erro ao criar hábito:', error);
    res.status(400).json({ success: false, message: 'Erro ao criar hábito', error });
  }
};

const obterHabito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());
    const habito = await Habito.findOne({ _id: req.params.id, usuario: usuarioId });
    if (!habito) return res.status(404).json({ success: false, message: 'Hábito não encontrado' });
    res.json({ success: true, data: habito });
  } catch (error) {
    console.error('❌ [Habito] Erro ao obter hábito:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter hábito', error });
  }
};

const atualizarHabito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());

    const updates = {
      titulo: req.body.titulo,
      descricao: req.body.descricao,
      data: req.body.data ? new Date(req.body.data) : undefined,
      hora: req.body.hora,
      prioridade: req.body.prioridade,
      status: req.body.status,
      area: req.body.area,
      categoria: req.body.categoria,
      valor: req.body.valor
    };

    const habito = await Habito.findOneAndUpdate(
      { _id: req.params.id, usuario: usuarioId },
      updates,
      { new: true, runValidators: true }
    );

    if (!habito) return res.status(404).json({ success: false, message: 'Hábito não encontrado' });

    res.json({ success: true, data: habito });
  } catch (error) {
    console.error('❌ [Habito] Erro ao atualizar hábito:', error);
    res.status(400).json({ success: false, message: 'Erro ao atualizar hábito', error });
  }
};

const excluirHabito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());
    const habito = await Habito.findOneAndDelete({ _id: req.params.id, usuario: usuarioId });
    if (!habito) return res.status(404).json({ success: false, message: 'Hábito não encontrado' });
    res.json({ success: true, message: 'Hábito excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Habito] Erro ao excluir hábito:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir hábito', error });
  }
};

module.exports = {
  listarHabitos,
  criarHabito,
  obterHabito,
  atualizarHabito,
  excluirHabito
};
