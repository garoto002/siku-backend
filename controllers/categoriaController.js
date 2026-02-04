const Categoria = require('../models/Categoria');
const Area = require('../models/Area');
const Gasto = require('../models/Gasto');
const Entrada = require('../models/Entrada');

// @desc    Listar todas as categorias de uma área
// @route   GET /api/categorias?area=:areaId
// @access  Private
const listarCategorias = async (req, res) => {
  try {
    const { area } = req.query;

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'ID da área é obrigatório'
      });
    }

    // Verificar se a área existe e pertence ao usuário
    const areaExistente = await Area.findOne({
      _id: area,
      usuario: req.usuario.id
    });

    if (!areaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    const categorias = await Categoria.find({
      area: area,
      usuario: req.usuario.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: categorias,
      count: categorias.length
    });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Criar uma nova categoria
// @route   POST /api/categorias
// @access  Private
const criarCategoria = async (req, res) => {
  try {
    const { nome, area, cor } = req.body;

    if (!nome || !area) {
      return res.status(400).json({
        success: false,
        message: 'Nome e área são obrigatórios'
      });
    }

    // Verificar se a área existe e pertence ao usuário
    const areaExistente = await Area.findOne({
      _id: area,
      usuario: req.usuario.id
    });

    if (!areaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    // Verificar se já existe uma categoria com esse nome nesta área
    const categoriaExistente = await Categoria.findOne({
      nome: nome.trim(),
      area: area,
      usuario: req.usuario.id
    });

    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma categoria com este nome nesta área'
      });
    }

    const categoria = await Categoria.create({
      nome: nome.trim(),
      area: area,
      cor: cor || '#10B981',
      usuario: req.usuario.id
    });

    res.status(201).json({
      success: true,
      data: categoria,
      message: 'Categoria criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);

    // Tratamento específico para erro de índice único
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma categoria com este nome nesta área'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Atualizar uma categoria
// @route   PUT /api/categorias/:id
// @access  Private
const atualizarCategoria = async (req, res) => {
  try {
    const { nome, cor } = req.body;
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOne({
      _id: categoriaId,
      usuario: req.usuario.id
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    categoria.nome = nome?.trim() || categoria.nome;
    categoria.cor = cor || categoria.cor;

    await categoria.save();

    res.status(200).json({
      success: true,
      data: categoria,
      message: 'Categoria atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Contar lançamentos vinculados a uma categoria
// @route   GET /api/categorias/:id/vinculos
// @access  Private
const contarVinculosCategoria = async (req, res) => {
  try {
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOne({ _id: categoriaId, usuario: req.usuario.id });
    if (!categoria) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    const gastos = await Gasto.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });
    const entradas = await Entrada.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });

    return res.status(200).json({ success: true, data: { gastos, entradas }, total: gastos + entradas });
  } catch (error) {
    console.error('Erro ao contar vínculos da categoria:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// @desc    Excluir uma categoria
// @route   DELETE /api/categorias/:id
// @access  Private
const excluirCategoria = async (req, res) => {
  try {
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOne({ _id: categoriaId, usuario: req.usuario.id });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Contar lançamentos vinculados
    const gastos = await Gasto.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });
    const entradas = await Entrada.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });

    if (gastos + entradas > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir categoria com lançamentos vinculados',
        linked: { gastos, entradas }
      });
    }

    await categoria.remove();

    res.status(200).json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Listar lançamentos vinculados a uma categoria (gastos + entradas)
// @route   GET /api/categorias/:id/lancamentos
// @access  Private
const listarVinculosCategoria = async (req, res) => {
  try {
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOne({ _id: categoriaId, usuario: req.usuario.id });
    if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada' });

    const { start, end, minValor, maxValor, limit = 50, skip = 0 } = req.query;
    const baseFilter = { categoria: categoriaId, usuario: req.usuario.id };

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
      if (minValor) f.valor = { ...(f.valor || {}), $gte: Number(minValor) };
      if (maxValor) f.valor = { ...(f.valor || {}), $lte: Number(maxValor) };
      return f;
    };

    const gastos = await Gasto.find(makeFilter()).sort({ data: -1 }).skip(Number(skip)).limit(Number(limit));
    const entradas = await Entrada.find(makeFilter()).sort({ data: -1 }).skip(Number(skip)).limit(Number(limit));

    const gastosCount = await Gasto.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });
    const entradasCount = await Entrada.countDocuments({ categoria: categoriaId, usuario: req.usuario.id });

    return res.status(200).json({ success: true, data: { gastos, entradas, counts: { gastos: gastosCount, entradas: entradasCount } } });
  } catch (error) {
    console.error('Erro ao listar vínculos da categoria:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// @desc    Reatribuir lançamentos de uma categoria para outra (bulk update)
// @route   POST /api/categorias/:id/reassign
// @access  Private
const reassignCategoria = async (req, res) => {
  try {
    const fromId = req.params.id;
    const { toCategoriaId, scope = 'both' } = req.body;

    if (!toCategoriaId) return res.status(400).json({ success: false, message: 'toCategoriaId é obrigatório' });

    const from = await Categoria.findOne({ _id: fromId, usuario: req.usuario.id });
    const to = await Categoria.findOne({ _id: toCategoriaId, usuario: req.usuario.id });

    if (!from || !to) return res.status(404).json({ success: false, message: 'Categoria origem ou destino não encontrada' });

    const result = { gastos: 0, entradas: 0 };

    if (scope === 'gastos' || scope === 'both') {
      const r = await Gasto.updateMany({ categoria: fromId, usuario: req.usuario.id }, { $set: { categoria: toCategoriaId } });
      result.gastos = (r && (r.modifiedCount ?? r.nModified ?? r.modified)) || 0;
    }

    if (scope === 'entradas' || scope === 'both') {
      const r2 = await Entrada.updateMany({ categoria: fromId, usuario: req.usuario.id }, { $set: { categoria: toCategoriaId } });
      result.entradas = (r2 && (r2.modifiedCount ?? r2.nModified ?? r2.modified)) || 0;
    }

    return res.status(200).json({ success: true, message: 'Reatribuição concluída', result });
  } catch (error) {
    console.error('Erro ao reatribuir categoria:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

module.exports = {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  contarVinculosCategoria,
  listarVinculosCategoria,
  reassignCategoria
};
