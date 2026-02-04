const Gasto = require('../models/Gasto');
const Entrada = require('../models/Entrada');
const Area = require('../models/Area');
const Categoria = require('../models/Categoria');
const { requireAuth } = require('../utils/helpers');

/**
 * Gera relatório em formato CSV
 */
exports.exportarCSV = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { tipo = 'todos', dataInicio, dataFim } = req.query;
    
    // Construir filtro de data
    const filtroData = { usuario: usuarioId };
    if (dataInicio || dataFim) {
      filtroData.data = {};
      if (dataInicio) filtroData.data.$gte = new Date(dataInicio);
      if (dataFim) {
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);
        filtroData.data.$lte = end;
      }
    }

    let dados = [];
    
    // Buscar dados conforme tipo
    if (tipo === 'gastos' || tipo === 'todos') {
      const gastos = await Gasto.find(filtroData)
        .populate('area', 'nome')
        .populate('categoria', 'nome')
        .sort({ data: -1 });
      
      gastos.forEach(g => {
        dados.push({
          tipo: 'Gasto',
          data: g.data?.toISOString().split('T')[0] || '',
          descricao: g.descricao || g.titulo || '',
          area: g.area?.nome || '',
          categoria: g.categoria?.nome || '',
          valor: -Math.abs(g.valor) // Gastos são negativos
        });
      });
    }

    if (tipo === 'entradas' || tipo === 'todos') {
      const entradas = await Entrada.find(filtroData)
        .populate('area', 'nome')
        .populate('categoria', 'nome')
        .sort({ data: -1 });
      
      entradas.forEach(e => {
        dados.push({
          tipo: 'Entrada',
          data: e.data?.toISOString().split('T')[0] || '',
          descricao: e.descricao || e.titulo || '',
          area: e.area?.nome || '',
          categoria: e.categoria?.nome || '',
          valor: Math.abs(e.valor) // Entradas são positivas
        });
      });
    }

    // Ordenar por data
    dados.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Gerar CSV
    const headers = ['Tipo', 'Data', 'Descrição', 'Área', 'Categoria', 'Valor'];
    const csvRows = [headers.join(';')];
    
    dados.forEach(d => {
      const row = [
        d.tipo,
        d.data,
        `"${(d.descricao || '').replace(/"/g, '""')}"`,
        d.area,
        d.categoria,
        d.valor.toFixed(2).replace('.', ',')
      ];
      csvRows.push(row.join(';'));
    });

    // Adicionar totais
    const totalGastos = dados.filter(d => d.tipo === 'Gasto').reduce((sum, d) => sum + d.valor, 0);
    const totalEntradas = dados.filter(d => d.tipo === 'Entrada').reduce((sum, d) => sum + d.valor, 0);
    const saldo = totalEntradas + totalGastos;

    csvRows.push('');
    csvRows.push(`Total Gastos;;;;;;${totalGastos.toFixed(2).replace('.', ',')}`);
    csvRows.push(`Total Entradas;;;;;;${totalEntradas.toFixed(2).replace('.', ',')}`);
    csvRows.push(`Saldo;;;;;;${saldo.toFixed(2).replace('.', ',')}`);

    const csv = csvRows.join('\n');

    // Definir headers para download
    const filename = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Adicionar BOM para Excel reconhecer UTF-8
    res.send('\uFEFF' + csv);

  } catch (error) {
    console.error('❌ [Relatório] Erro ao exportar CSV:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar relatório' });
  }
};

/**
 * Gera relatório em formato JSON estruturado (para PDF no frontend)
 */
exports.exportarRelatorio = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { dataInicio, dataFim } = req.query;
    
    const filtroData = { usuario: usuarioId };
    if (dataInicio || dataFim) {
      filtroData.data = {};
      if (dataInicio) filtroData.data.$gte = new Date(dataInicio);
      if (dataFim) {
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);
        filtroData.data.$lte = end;
      }
    }

    // Buscar todos os dados
    const [gastos, entradas, areas, categorias] = await Promise.all([
      Gasto.find(filtroData).populate('area categoria').sort({ data: -1 }),
      Entrada.find(filtroData).populate('area categoria').sort({ data: -1 }),
      Area.find({ usuario: usuarioId }),
      Categoria.find({ usuario: usuarioId })
    ]);

    // Calcular totais
    const totalGastos = gastos.reduce((sum, g) => sum + (g.valor || 0), 0);
    const totalEntradas = entradas.reduce((sum, e) => sum + (e.valor || 0), 0);
    const saldo = totalEntradas - totalGastos;

    // Agrupar gastos por área
    const gastosPorArea = {};
    gastos.forEach(g => {
      const areaNome = g.area?.nome || 'Sem área';
      if (!gastosPorArea[areaNome]) {
        gastosPorArea[areaNome] = { total: 0, count: 0, items: [] };
      }
      gastosPorArea[areaNome].total += g.valor || 0;
      gastosPorArea[areaNome].count += 1;
      gastosPorArea[areaNome].items.push({
        data: g.data,
        descricao: g.descricao || g.titulo,
        categoria: g.categoria?.nome,
        valor: g.valor
      });
    });

    // Agrupar entradas por área
    const entradasPorArea = {};
    entradas.forEach(e => {
      const areaNome = e.area?.nome || 'Sem área';
      if (!entradasPorArea[areaNome]) {
        entradasPorArea[areaNome] = { total: 0, count: 0, items: [] };
      }
      entradasPorArea[areaNome].total += e.valor || 0;
      entradasPorArea[areaNome].count += 1;
      entradasPorArea[areaNome].items.push({
        data: e.data,
        descricao: e.descricao || e.titulo,
        categoria: e.categoria?.nome,
        valor: e.valor
      });
    });

    // Gastos por categoria (top 10)
    const gastosPorCategoria = {};
    gastos.forEach(g => {
      const catNome = g.categoria?.nome || 'Sem categoria';
      gastosPorCategoria[catNome] = (gastosPorCategoria[catNome] || 0) + (g.valor || 0);
    });
    const topCategorias = Object.entries(gastosPorCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, valor]) => ({ nome, valor, percentual: totalGastos > 0 ? (valor / totalGastos * 100).toFixed(1) : 0 }));

    res.json({
      success: true,
      relatorio: {
        periodo: {
          inicio: dataInicio || null,
          fim: dataFim || null,
          geradoEm: new Date()
        },
        resumo: {
          totalGastos,
          totalEntradas,
          saldo,
          quantidadeGastos: gastos.length,
          quantidadeEntradas: entradas.length
        },
        gastosPorArea,
        entradasPorArea,
        topCategorias,
        gastos: gastos.map(g => ({
          data: g.data,
          descricao: g.descricao || g.titulo,
          area: g.area?.nome,
          categoria: g.categoria?.nome,
          valor: g.valor
        })),
        entradas: entradas.map(e => ({
          data: e.data,
          descricao: e.descricao || e.titulo,
          area: e.area?.nome,
          categoria: e.categoria?.nome,
          valor: e.valor
        }))
      }
    });

  } catch (error) {
    console.error('❌ [Relatório] Erro ao gerar relatório:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar relatório' });
  }
};

/**
 * Resumo financeiro rápido
 */
exports.resumoFinanceiro = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { mes, ano } = req.query;
    
    // Default para mês atual
    const agora = new Date();
    const mesAtual = mes ? parseInt(mes) : agora.getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : agora.getFullYear();

    const dataInicio = new Date(anoAtual, mesAtual - 1, 1);
    const dataFim = new Date(anoAtual, mesAtual, 0, 23, 59, 59, 999);

    const filtro = {
      usuario: usuarioId,
      data: { $gte: dataInicio, $lte: dataFim }
    };

    const [gastos, entradas] = await Promise.all([
      Gasto.aggregate([
        { $match: { ...filtro, usuario: require('mongoose').Types.ObjectId.createFromHexString(usuarioId) } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      Entrada.aggregate([
        { $match: { ...filtro, usuario: require('mongoose').Types.ObjectId.createFromHexString(usuarioId) } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalGastos = gastos[0]?.total || 0;
    const totalEntradas = entradas[0]?.total || 0;
    const countGastos = gastos[0]?.count || 0;
    const countEntradas = entradas[0]?.count || 0;

    res.json({
      success: true,
      resumo: {
        mes: mesAtual,
        ano: anoAtual,
        totalGastos,
        totalEntradas,
        saldo: totalEntradas - totalGastos,
        quantidadeGastos: countGastos,
        quantidadeEntradas: countEntradas,
        mediaDiariaGastos: countGastos > 0 ? totalGastos / new Date(anoAtual, mesAtual, 0).getDate() : 0
      }
    });

  } catch (error) {
    console.error('❌ [Relatório] Erro ao gerar resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar resumo' });
  }
};
