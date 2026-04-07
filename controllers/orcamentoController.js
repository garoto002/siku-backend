const Orcamento = require('../models/Orcamento');
const Gasto = require('../models/Gasto');
const mongoose = require('mongoose');
const { requireAuth, filterFields, devLog } = require('../utils/helpers');

// Listar orçamentos do usuário
const listarOrcamentos = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { tipo, mes, ano, semana, page = 1, limit = 50 } = req.query;
    const filtro = { usuario: usuarioId };

    if (tipo) filtro.tipo = tipo;
    if (ano) filtro.ano = Number(ano);
    if (mes) filtro.mes = Number(mes);
    if (semana) filtro.semana = Number(semana);

    const skip = (Number(page) - 1) * Number(limit);
    const orcamentos = await Orcamento.find(filtro)
      .sort({ ano: -1, mes: -1, semana: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Orcamento.countDocuments(filtro);

    res.json({
      success: true,
      orcamentos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao listar:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar orçamentos', error: error.message });
  }
};

// Criar orçamento
const criarOrcamento = async (req, res) => {
  try {
    devLog('📥 [Orcamento] Criando orçamento');
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const dados = filterFields(req.body, 'orcamento');

    if (!dados.area || !dados.categoria || typeof dados.valorPlanejado === 'undefined') {
      return res.status(400).json({ success: false, message: 'Área, categoria e valor planejado são obrigatórios' });
    }

    if (dados.tipo === 'mensal' && !dados.mes) {
      return res.status(400).json({ success: false, message: 'Mês é obrigatório para orçamento mensal' });
    }

    if (dados.tipo === 'semanal' && !dados.semana) {
      return res.status(400).json({ success: false, message: 'Semana é obrigatória para orçamento semanal' });
    }

    const novoOrcamento = new Orcamento({ ...dados, usuario: usuarioId });
    await novoOrcamento.save();
    devLog('✅ [Orcamento] Criado com sucesso:', novoOrcamento._id);
    res.json({ success: true, orcamento: novoOrcamento });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao criar:', error);
    res.status(400).json({ success: false, message: 'Erro ao criar orçamento', error: error.message });
  }
};

// Obter orçamento por ID
const obterOrcamento = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const orcamento = await Orcamento.findOne({ _id: req.params.id, usuario: usuarioId });
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao obter:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter orçamento', error: error.message });
  }
};

// Atualizar orçamento
const atualizarOrcamento = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const updates = filterFields(req.body, 'orcamento');

    const orcamento = await Orcamento.findOneAndUpdate(
      { _id: req.params.id, usuario: usuarioId },
      updates,
      { new: true, runValidators: true }
    );

    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, data: orcamento });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao atualizar:', error);
    res.status(400).json({ success: false, message: 'Erro ao atualizar orçamento', error: error.message });
  }
};

// Excluir orçamento
const excluirOrcamento = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const orcamento = await Orcamento.findOneAndDelete({ _id: req.params.id, usuario: usuarioId });
    if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
    res.json({ success: true, message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao excluir:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir orçamento', error: error.message });
  }
};

// Comparar orçamento planejado vs gastos reais
const compararOrcamento = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { tipo = 'mensal', mes, ano, semana } = req.query;

    if (!ano) {
      return res.status(400).json({ success: false, message: 'Ano é obrigatório' });
    }

    // Buscar orçamentos planejados
    const filtroOrcamento = {
      usuario: usuarioId,
      tipo,
      ano: Number(ano)
    };
    if (tipo === 'mensal' && mes) filtroOrcamento.mes = Number(mes);
    if (tipo === 'semanal' && semana) filtroOrcamento.semana = Number(semana);

    const orcamentos = await Orcamento.find(filtroOrcamento);

    // Calcular período de datas para buscar gastos reais
    let dataInicio, dataFim;

    if (tipo === 'mensal' && mes) {
      dataInicio = new Date(Number(ano), Number(mes) - 1, 1);
      dataFim = new Date(Number(ano), Number(mes), 0, 23, 59, 59, 999);
    } else if (tipo === 'semanal' && semana) {
      // Calcular início e fim da semana ISO
      const jan4 = new Date(Number(ano), 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const isoWeek1Start = new Date(jan4);
      isoWeek1Start.setDate(jan4.getDate() - dayOfWeek + 1);
      dataInicio = new Date(isoWeek1Start);
      dataInicio.setDate(isoWeek1Start.getDate() + (Number(semana) - 1) * 7);
      dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + 6);
      dataFim.setHours(23, 59, 59, 999);
    } else {
      // Todo o ano
      dataInicio = new Date(Number(ano), 0, 1);
      dataFim = new Date(Number(ano), 11, 31, 23, 59, 59, 999);
    }

    // Buscar gastos reais agrupados por area+categoria
    const gastosReais = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: dataInicio, $lte: dataFim }
        }
      },
      {
        $group: {
          _id: { area: '$area', categoria: '$categoria' },
          totalReal: { $sum: '$valor' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Montar mapa de gastos reais
    const gastosMap = {};
    gastosReais.forEach(g => {
      const key = `${g._id.area}_${g._id.categoria}`;
      gastosMap[key] = { totalReal: g.totalReal, count: g.count };
    });

    // Montar comparação
    const comparacao = orcamentos.map(orc => {
      const key = `${orc.area}_${orc.categoria}`;
      const real = gastosMap[key] || { totalReal: 0, count: 0 };
      const diferenca = orc.valorPlanejado - real.totalReal;
      const percentual = orc.valorPlanejado > 0
        ? Math.round((real.totalReal / orc.valorPlanejado) * 100)
        : 0;

      return {
        _id: orc._id,
        titulo: orc.titulo,
        area: orc.area,
        categoria: orc.categoria,
        valorPlanejado: orc.valorPlanejado,
        valorReal: real.totalReal,
        quantidadeGastos: real.count,
        diferenca,
        percentual,
        status: percentual <= 100 ? 'dentro' : 'excedido'
      };
    });

    // Totais gerais
    const totalPlanejado = comparacao.reduce((sum, c) => sum + c.valorPlanejado, 0);
    const totalReal = comparacao.reduce((sum, c) => sum + c.valorReal, 0);

    res.json({
      success: true,
      comparacao,
      resumo: {
        totalPlanejado,
        totalReal,
        diferenca: totalPlanejado - totalReal,
        percentual: totalPlanejado > 0 ? Math.round((totalReal / totalPlanejado) * 100) : 0
      }
    });
  } catch (error) {
    console.error('❌ [Orcamento] Erro ao comparar:', error);
    res.status(500).json({ success: false, message: 'Erro ao comparar orçamento', error: error.message });
  }
};

module.exports = {
  listarOrcamentos,
  criarOrcamento,
  obterOrcamento,
  atualizarOrcamento,
  excluirOrcamento,
  compararOrcamento
};
