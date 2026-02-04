const Gasto = require('../models/Gasto');
const mongoose = require('mongoose');
const { requireAuth, filterFields, devLog } = require('../utils/helpers');

// Totais / Relatórios de gastos
const totaisGastos = async (req, res) => {
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

    // Agrupamento por período (quando groupBy === 'none')
    if (groupBy === 'none') {
      // Gerar campo periodKey conforme periodo solicitado
      if (period === 'daily') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m-%d', date: '$data' } } } });
      } else if (period === 'weekly') {
        pipeline.push({ $addFields: { periodKey: { $concat: [ { $toString: { $isoWeekYear: '$data' } }, '-', { $toString: { $isoWeek: '$data' } } ] } } });
      } else if (period === 'monthly') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m', date: '$data' } } } });
      } else if (period === 'yearly') {
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y', date: '$data' } } } });
      } else {
        // default to daily
        pipeline.push({ $addFields: { periodKey: { $dateToString: { format: '%Y-%m-%d', date: '$data' } } } });
      }

      pipeline.push({ $group: { _id: '$periodKey', total: { $sum: '$valor' }, count: { $sum: 1 } } });
      pipeline.push({ $project: { _id: 0, key: '$_id', total: 1, count: 1 } });
      pipeline.push({ $sort: { key: 1 } });
      if (limit) pipeline.push({ $limit: Number(limit) });

      const results = await Gasto.aggregate(pipeline);
      return res.json({ success: true, meta: { period, groupBy, start: start || null, end: end || null }, totals: results });
    }

    // Agrupamento por área / categoria / descricao
    const field = `$${groupBy}`; // expects 'area' | 'categoria' | 'descricao'
    pipeline.push({ $group: { _id: field, total: { $sum: '$valor' }, count: { $sum: 1 } } });
    pipeline.push({ $project: { _id: 0, key: { $ifNull: ['$_id', 'Sem valor'] }, total: 1, count: 1 } });
    pipeline.push({ $sort: { total: -1 } });
    if (limit) pipeline.push({ $limit: Number(limit) });

    const results = await Gasto.aggregate(pipeline);
    return res.json({ success: true, meta: { period: period || null, groupBy }, totals: results });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao gerar totais:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar totais', error });
  }
};

const listarGastos = async (req, res) => {
  try {
    devLog('🔎 [Gasto] Listando gastos para usuário:', req.usuario?._id || req.usuario?.id);
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
    const gastos = await Gasto.find(filtro)
      .sort({ data: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Gasto.countDocuments(filtro);
    
    res.json({ 
      success: true, 
      gastos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao listar gastos:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar gastos', error: error.message });
  }
};

const criarGasto = async (req, res) => {
  try {
    devLog('📥 [Gasto] Criando gasto para usuário:', req.usuario?._id || req.usuario?.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    // Filtrar apenas campos permitidos
    const dadosGasto = filterFields(req.body, 'gasto');
    
    if (!dadosGasto.area || !dadosGasto.categoria || typeof dadosGasto.valor === 'undefined') {
      return res.status(400).json({ success: false, message: 'Área, categoria e valor são obrigatórios' });
    }

    const novoGasto = new Gasto({ ...dadosGasto, usuario: usuarioId });
    await novoGasto.save();
    devLog('✅ [Gasto] Gasto salvo com sucesso:', novoGasto._id);
    res.json({ success: true, gasto: novoGasto });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao criar gasto:', error);
    res.status(400).json({ success: false, message: 'Erro ao criar gasto', error: error.message });
  }
};

const obterGasto = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;
    
    const gasto = await Gasto.findOne({ _id: req.params.id, usuario: usuarioId });
    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
    res.json({ success: true, data: gasto });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao obter gasto:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter gasto', error: error.message });
  }
};

const atualizarGasto = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    // Filtrar apenas campos permitidos
    const updates = filterFields(req.body, 'gasto');
    if (updates.data) updates.data = new Date(updates.data);

    const gasto = await Gasto.findOneAndUpdate(
      { _id: req.params.id, usuario: usuarioId },
      updates,
      { new: true, runValidators: true }
    );

    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });

    res.json({ success: true, data: gasto });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao atualizar gasto:', error);
    res.status(400).json({ success: false, message: 'Erro ao atualizar gasto', error: error.message });
  }
};

const excluirGasto = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;
    
    const gasto = await Gasto.findOneAndDelete({ _id: req.params.id, usuario: usuarioId });
    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
    res.json({ success: true, message: 'Gasto excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Gasto] Erro ao excluir gasto:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir gasto', error: error.message });
  }
};

module.exports = {
  listarGastos,
  criarGasto,
  obterGasto,
  atualizarGasto,
  excluirGasto,
  totaisGastos
};