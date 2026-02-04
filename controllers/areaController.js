const Area = require('../models/Area');
const Gasto = require('../models/Gasto');
const Entrada = require('../models/Entrada');

// @desc    Listar todas as áreas do usuário
// @route   GET /api/areas
// @access  Private
const listarAreas = async (req, res) => {
  try {
    const areas = await Area.find({ usuario: req.usuario.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: areas,
      count: areas.length
    });
  } catch (error) {
    console.error('Erro ao listar áreas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Criar uma nova área
// @route   POST /api/areas
// @access  Private
const criarArea = async (req, res) => {
  try {
    const { nome, cor } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome da área é obrigatório'
      });
    }

    // Verificar se já existe uma área com esse nome para o usuário
    const areaExistente = await Area.findOne({
      nome: nome.trim(),
      usuario: req.usuario.id
    });

    if (areaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma área com este nome'
      });
    }

    const area = await Area.create({
      nome: nome.trim(),
      cor: cor || '#3B82F6',
      usuario: req.usuario.id
    });

    res.status(201).json({
      success: true,
      data: area,
      message: 'Área criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar área:', error);

    // Tratamento específico para erro de índice único
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma área com este nome'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Atualizar uma área
// @route   PUT /api/areas/:id
// @access  Private
const atualizarArea = async (req, res) => {
  try {
    const { nome, cor } = req.body;
    const areaId = req.params.id;

    const area = await Area.findOne({
      _id: areaId,
      usuario: req.usuario.id
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    area.nome = nome?.trim() || area.nome;
    area.cor = cor || area.cor;

    await area.save();

    res.status(200).json({
      success: true,
      data: area,
      message: 'Área atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar área:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Contar lançamentos vinculados a uma área
// @route   GET /api/areas/:id/vinculos
// @access  Private
const contarVinculosArea = async (req, res) => {
  try {
    const areaId = req.params.id;

    const area = await Area.findOne({ _id: areaId, usuario: req.usuario.id });
    if (!area) {
      return res.status(404).json({ success: false, message: 'Área não encontrada' });
    }

    const gastos = await Gasto.countDocuments({ area: areaId, usuario: req.usuario.id });
    const entradas = await Entrada.countDocuments({ area: areaId, usuario: req.usuario.id });

    return res.status(200).json({ success: true, data: { gastos, entradas }, total: gastos + entradas });
  } catch (error) {
    console.error('Erro ao contar vínculos da área:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// @desc    Excluir uma área
// @route   DELETE /api/areas/:id
// @access  Private
const excluirArea = async (req, res) => {
  try {
    const areaId = req.params.id;

    const area = await Area.findOne({ _id: areaId, usuario: req.usuario.id });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    // Contar lançamentos vinculados
    const gastos = await Gasto.countDocuments({ area: areaId, usuario: req.usuario.id });
    const entradas = await Entrada.countDocuments({ area: areaId, usuario: req.usuario.id });

    if (gastos + entradas > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir área com lançamentos vinculados',
        linked: { gastos, entradas }
      });
    }

    await area.remove();

    res.status(200).json({
      success: true,
      message: 'Área excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir área:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Listar lançamentos vinculados a uma área (gastos + entradas)
// @route   GET /api/areas/:id/lancamentos
// @access  Private
const listarVinculosArea = async (req, res) => {
  try {
    const areaId = req.params.id;

    const area = await Area.findOne({ _id: areaId, usuario: req.usuario.id });
    if (!area) return res.status(404).json({ success: false, message: 'Área não encontrada' });

    // Filtros e paginação opcionais
    const { start, end, minValor, maxValor, limit = 50, skip = 0 } = req.query;

    const baseFilter = { area: areaId, usuario: req.usuario.id };

    const makeFilter = () => {
      const f = { ...baseFilter };
      if (start) {
        const s = new Date(start);
        s.setHours(0,0,0,0);
        f.data = { ...(f.data || {}), $gte: s };
      }
      if (end) {
        const e = new Date(end);
        e.setHours(23,59,59,999);
        f.data = { ...(f.data || {}), $lte: e };
      }
      if (minValor) {
        f.valor = { ...(f.valor || {}), $gte: Number(minValor) };
      }
      if (maxValor) {
        f.valor = { ...(f.valor || {}), $lte: Number(maxValor) };
      }
      return f;
    };

    const gastos = await Gasto.find(makeFilter()).sort({ data: -1 }).skip(Number(skip)).limit(Number(limit));
    const entradas = await Entrada.find(makeFilter()).sort({ data: -1 }).skip(Number(skip)).limit(Number(limit));

    const gastosCount = await Gasto.countDocuments({ area: areaId, usuario: req.usuario.id });
    const entradasCount = await Entrada.countDocuments({ area: areaId, usuario: req.usuario.id });

    return res.status(200).json({ success: true, data: { gastos, entradas, counts: { gastos: gastosCount, entradas: entradasCount } } });
  } catch (error) {
    console.error('Erro ao listar vínculos da área:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// @desc    Reatribuir lançamentos de uma área para outra (bulk update)
// @route   POST /api/areas/:id/reassign
// @access  Private
const reassignArea = async (req, res) => {
  try {
    const fromId = req.params.id;
    const { toAreaId, scope = 'both' } = req.body; // scope: 'gastos' | 'entradas' | 'both'

    if (!toAreaId) return res.status(400).json({ success: false, message: 'toAreaId é obrigatório' });

    const from = await Area.findOne({ _id: fromId, usuario: req.usuario.id });
    const to = await Area.findOne({ _id: toAreaId, usuario: req.usuario.id });

    if (!from || !to) return res.status(404).json({ success: false, message: 'Área origem ou destino não encontrada' });

    const result = { gastos: 0, entradas: 0 };

    if (scope === 'gastos' || scope === 'both') {
      const r = await Gasto.updateMany({ area: fromId, usuario: req.usuario.id }, { $set: { area: toAreaId } });
      result.gastos = (r && (r.modifiedCount ?? r.nModified ?? r.modified)) || 0;
    }

    if (scope === 'entradas' || scope === 'both') {
      const r2 = await Entrada.updateMany({ area: fromId, usuario: req.usuario.id }, { $set: { area: toAreaId } });
      result.entradas = (r2 && (r2.modifiedCount ?? r2.nModified ?? r2.modified)) || 0;
    }

    return res.status(200).json({ success: true, message: 'Reatribuição concluída', result });
  } catch (error) {
    console.error('Erro ao reatribuir área:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

module.exports = {
  listarAreas,
  criarArea,
  atualizarArea,
  excluirArea,
  contarVinculosArea,
  listarVinculosArea,
  reassignArea
};
