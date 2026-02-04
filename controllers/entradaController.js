const Entrada = require('../models/Entrada');
const Area = require('../models/Area');
const Categoria = require('../models/Categoria');
const mongoose = require('mongoose');
const { requireAuth, filterFields, devLog } = require('../utils/helpers');

exports.listarEntradas = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { dataInicio, dataFim, page = 1, limit = 50 } = req.query;
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

    const skip = (Number(page) - 1) * Number(limit);
    const entradas = await Entrada.find(filtro)
      .sort({ data: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Entrada.countDocuments(filtro);
    
    res.json({ 
      success: true, 
      entradas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('❌ [Entrada] Erro ao listar entradas:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar entradas' });
  }
};

// Totais / Relatórios de entradas (paralelo a totaisGastos)
exports.totaisEntradas = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { period = 'daily', groupBy = 'none', start, end, limit } = req.query;

    const filtro = { usuario: new mongoose.Types.ObjectId(usuarioId) };
    if (start || end) {
      filtro.data = {};
      if (start) filtro.data.$gte = new Date(start);
      if (end) {
        const d = new Date(end);
        d.setHours(23,59,59,999);
        filtro.data.$lte = d;
      }
    }

    const pipeline = [{ $match: filtro }];

    if (groupBy === 'none') {
      if (period === 'daily') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m-%d', date: '$data' } } } });
      } else if (period === 'weekly') {
        pipeline.push({ $addFields: { periodKey: { $concat: [ { $toString: { $isoWeekYear: '$data' } }, '-', { $toString: { $isoWeek: '$data' } } ] } } });
      } else if (period === 'monthly') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m', date: '$data' } } } });
      } else if (period === 'yearly') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y', date: '$data' } } } });
      } else {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m-%d', date: '$data' } } } });
      }

      pipeline.push({ $group: { _id: '$periodKey', total: { $sum: '$valor' }, count: { $sum: 1 } } });
      pipeline.push({ $project: { _id: 0, key: '$_id', total: 1, count: 1 } });
      pipeline.push({ $sort: { key: 1 } });
      if (limit) pipeline.push({ $limit: Number(limit) });

      const results = await Entrada.aggregate(pipeline);
      return res.json({ success: true, meta: { period, groupBy, start: start || null, end: end || null }, totals: results });
    }

    const field = `$${groupBy}`;
    pipeline.push({ $group: { _id: field, total: { $sum: '$valor' }, count: { $sum: 1 } } });
    pipeline.push({ $project: { _id: 0, key: { $ifNull: ['$_id', 'Sem valor'] }, total: 1, count: 1 } });
    pipeline.push({ $sort: { total: -1 } });
    if (limit) pipeline.push({ $limit: Number(limit) });

    const results = await Entrada.aggregate(pipeline);

    // Se agrupar por área ou categoria, buscar nomes legíveis
    if (groupBy === 'area' || groupBy === 'categoria') {
      try {
        const ids = results.map(r => r.key).filter(k => k && k !== 'Sem valor');
        let docs = [];
        if (groupBy === 'area') docs = await Area.find({ _id: { $in: ids } });
        else docs = await Categoria.find({ _id: { $in: ids } });
        const nameMap = {};
        docs.forEach(d => { nameMap[d._id.toString()] = d.nome || d.nome; });
        const mapped = results.map(r => ({ ...r, key: (nameMap[r.key] || r.key) }));
        return res.json({ success: true, meta: { period: period || null, groupBy }, totals: mapped });
      } catch (e) {
        console.error('❌ [Entrada] Erro ao popular nomes:', e);
        // fallback para retornar ids
      }
    }

    return res.json({ success: true, meta: { period: period || null, groupBy }, totals: results });
  } catch (error) {
    console.error('❌ [Entrada] Erro ao gerar totais:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar totais', error });
  }
};

exports.criarEntrada = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    // Filtrar apenas campos permitidos
    const dadosEntrada = filterFields(req.body, 'entrada');
    
    if (!dadosEntrada.area || !dadosEntrada.categoria || typeof dadosEntrada.valor === 'undefined') {
      return res.status(400).json({ success: false, message: 'Área, categoria e valor são obrigatórios' });
    }

    const entrada = new Entrada({
      ...dadosEntrada,
      usuario: usuarioId,
      data: dadosEntrada.data ? new Date(dadosEntrada.data) : Date.now(),
      titulo: dadosEntrada.titulo || dadosEntrada.descricao,
      status: dadosEntrada.status || 'pendente',
    });
    await entrada.save();
    devLog('✅ [Entrada] Entrada criada:', entrada._id);
    res.status(201).json({ success: true, entrada });
  } catch (err) {
    console.error('❌ [Entrada] Erro ao criar entrada:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar entrada' });
  }
};

exports.obterEntrada = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;
    
    const entrada = await Entrada.findOne({ _id: req.params.id, usuario: usuarioId });
    if (!entrada) return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
    res.json({ success: true, entrada });
  } catch (err) {
    console.error('❌ [Entrada] Erro ao obter entrada:', err);
    res.status(500).json({ success: false, message: 'Erro ao obter entrada' });
  }
};

exports.atualizarEntrada = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    // Filtrar apenas campos permitidos
    const updates = filterFields(req.body, 'entrada');
    if (updates.data) updates.data = new Date(updates.data);

    const entrada = await Entrada.findOneAndUpdate(
      { _id: req.params.id, usuario: usuarioId },
      updates,
      { new: true, runValidators: true }
    );

    if (!entrada) return res.status(404).json({ success: false, message: 'Entrada não encontrada' });

    res.json({ success: true, entrada });
  } catch (err) {
    console.error('❌ [Entrada] Erro ao atualizar entrada:', err);
    res.status(400).json({ success: false, message: 'Erro ao atualizar entrada', error: err.message });
  }
};

exports.deleteEntrada = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;
    
    const entrada = await Entrada.findOneAndDelete({ _id: req.params.id, usuario: usuarioId });
    if (!entrada) return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
    res.json({ success: true, message: 'Entrada removida' });
  } catch (err) {
    console.error('❌ [Entrada] Erro ao remover entrada:', err);
    res.status(500).json({ success: false, message: 'Erro ao remover entrada' });
  }
};
