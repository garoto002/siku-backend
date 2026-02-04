const mongoose = require('mongoose');
const Gasto = require('../models/Gasto');
const Entrada = require('../models/Entrada');
const Meta = require('../models/Meta');
const Atividade = require('../models/Atividade');
const Projeto = require('../models/Projeto');
// NOTA: Habito foi removido - agora tudo é Gasto
const { gerarAnaliseFinanceira, gerarDicaDoDia, chatComAssistente } = require('../services/aiService');

// Função auxiliar para calcular estatísticas
const calcularEstatisticas = (valores) => {
  if (!valores || valores.length === 0) return { media: 0, min: 0, max: 0, total: 0, count: 0 };
  const total = valores.reduce((a, b) => a + b, 0);
  return {
    media: total / valores.length,
    min: Math.min(...valores),
    max: Math.max(...valores),
    total,
    count: valores.length
  };
};

// Função para calcular tendência (crescimento/decrescimento)
const calcularTendencia = (atual, anterior) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

// Função para obter período de datas
const getPeriodoDatas = (dias) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - dias);
  return { start, end: now };
};

// ==================== INSIGHTS PRINCIPAIS ====================

const getInsightsFinanceiros = async (req, res) => {
  try {
    const userId = req.usuario._id;
    const now = new Date();
    
    // Períodos para análise
    const mesAtual = getPeriodoDatas(30);
    const mesAnterior = { start: new Date(mesAtual.start), end: new Date(mesAtual.start) };
    mesAnterior.start.setDate(mesAnterior.start.getDate() - 30);
    
    const semanaAtual = getPeriodoDatas(7);
    const semanaAnterior = { start: new Date(semanaAtual.start), end: new Date(semanaAtual.start) };
    semanaAnterior.start.setDate(semanaAnterior.start.getDate() - 7);

    // ===== GASTOS =====
    const gastosMesAtual = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
      { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 }, valores: { $push: '$valor' } } }
    ]);
    
    const gastosMesAnterior = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAnterior.start, $lt: mesAnterior.end } } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);

    const gastosSemanaAtual = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: semanaAtual.start, $lte: semanaAtual.end } } },
      { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
    ]);

    const gastosSemanaAnterior = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: semanaAnterior.start, $lt: semanaAnterior.end } } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);

    // Gastos por categoria (top 5)
    const gastosPorCategoria = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
      { $group: { _id: '$categoria', total: { $sum: '$valor' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Gastos por dia da semana
    const gastosPorDiaSemana = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
      { $group: { _id: { $dayOfWeek: '$data' }, total: { $sum: '$valor' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // ===== ENTRADAS =====
    const entradasMesAtual = await Entrada.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
      { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
    ]);

    const entradasMesAnterior = await Entrada.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAnterior.start, $lt: mesAnterior.end } } },
      { $group: { _id: null, total: { $sum: '$valor' } } }
    ]);

    // ===== CÁLCULOS =====
    const totalGastosMes = gastosMesAtual[0]?.total || 0;
    const totalGastosMesAnterior = gastosMesAnterior[0]?.total || 0;
    const totalGastosSemana = gastosSemanaAtual[0]?.total || 0;
    const totalGastosSemanaAnterior = gastosSemanaAnterior[0]?.total || 0;
    
    const totalEntradasMes = entradasMesAtual[0]?.total || 0;
    const totalEntradasMesAnterior = entradasMesAnterior[0]?.total || 0;

    const balancoMes = totalEntradasMes - totalGastosMes;
    const balancoMesAnterior = totalEntradasMesAnterior - totalGastosMesAnterior;

    const taxaPoupanca = totalEntradasMes > 0 ? ((totalEntradasMes - totalGastosMes) / totalEntradasMes) * 100 : 0;
    
    // Média diária de gastos
    const mediaDiariaGastos = totalGastosMes / 30;
    
    // Projeção para o fim do mês
    const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const projecaoGastosMes = totalGastosMes + (mediaDiariaGastos * diasRestantes);

    // Dia com mais gastos
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaMaisGastos = gastosPorDiaSemana[0] ? diasSemana[gastosPorDiaSemana[0]._id - 1] : 'N/A';

    // ===== GERAR INSIGHTS =====
    const insights = [];

    // Insight 1: Tendência de gastos
    const tendenciaGastos = calcularTendencia(totalGastosMes, totalGastosMesAnterior);
    if (tendenciaGastos > 20) {
      insights.push({
        tipo: 'alerta',
        icone: 'trending-up',
        titulo: 'Gastos em Alta',
        descricao: `Seus gastos aumentaram ${Math.abs(tendenciaGastos).toFixed(1)}% comparado ao mês anterior. Considere revisar suas despesas.`,
        valor: tendenciaGastos,
        prioridade: 'alta'
      });
    } else if (tendenciaGastos < -10) {
      insights.push({
        tipo: 'positivo',
        icone: 'trending-down',
        titulo: 'Boa Economia!',
        descricao: `Você reduziu seus gastos em ${Math.abs(tendenciaGastos).toFixed(1)}% comparado ao mês anterior. Continue assim!`,
        valor: tendenciaGastos,
        prioridade: 'baixa'
      });
    }

    // Insight 2: Taxa de poupança
    if (taxaPoupanca < 0) {
      insights.push({
        tipo: 'critico',
        icone: 'alert-circle',
        titulo: 'Déficit Financeiro',
        descricao: `Você está gastando mais do que ganha. Déficit de MZN ${Math.abs(balancoMes).toFixed(2)} este mês.`,
        valor: balancoMes,
        prioridade: 'critica'
      });
    } else if (taxaPoupanca >= 20) {
      insights.push({
        tipo: 'positivo',
        icone: 'piggy-bank',
        titulo: 'Excelente Poupança!',
        descricao: `Você está poupando ${taxaPoupanca.toFixed(1)}% da sua renda. Meta recomendada: 20%. Parabéns!`,
        valor: taxaPoupanca,
        prioridade: 'baixa'
      });
    } else if (taxaPoupanca > 0 && taxaPoupanca < 10) {
      insights.push({
        tipo: 'aviso',
        icone: 'alert-triangle',
        titulo: 'Poupança Baixa',
        descricao: `Sua taxa de poupança é de apenas ${taxaPoupanca.toFixed(1)}%. Tente aumentar para pelo menos 20%.`,
        valor: taxaPoupanca,
        prioridade: 'media'
      });
    }

    // Insight 3: Categoria com mais gastos
    if (gastosPorCategoria.length > 0) {
      const topCategoria = gastosPorCategoria[0];
      const percentualTop = (topCategoria.total / totalGastosMes) * 100;
      if (percentualTop > 40) {
        insights.push({
          tipo: 'info',
          icone: 'pie-chart',
          titulo: 'Concentração de Gastos',
          descricao: `${percentualTop.toFixed(1)}% dos seus gastos estão na categoria "${topCategoria._id || 'Sem categoria'}". Considere diversificar.`,
          valor: percentualTop,
          categoria: topCategoria._id,
          prioridade: 'media'
        });
      }
    }

    // Insight 4: Padrão de gastos semanais
    if (diaMaisGastos !== 'N/A') {
      insights.push({
        tipo: 'info',
        icone: 'calendar',
        titulo: 'Padrão de Gastos',
        descricao: `Você tende a gastar mais na ${diaMaisGastos}. Planeje melhor esses dias.`,
        valor: gastosPorDiaSemana[0]?.total || 0,
        prioridade: 'baixa'
      });
    }

    // Insight 5: Projeção
    if (projecaoGastosMes > totalGastosMesAnterior * 1.2) {
      insights.push({
        tipo: 'aviso',
        icone: 'clock',
        titulo: 'Projeção de Gastos',
        descricao: `Se continuar nesse ritmo, gastará aproximadamente MZN ${projecaoGastosMes.toFixed(2)} este mês, ${((projecaoGastosMes / totalGastosMesAnterior - 1) * 100).toFixed(1)}% mais que o mês anterior.`,
        valor: projecaoGastosMes,
        prioridade: 'media'
      });
    }

    // Insight 6: Semana atual vs anterior
    const tendenciaSemanal = calcularTendencia(totalGastosSemana, totalGastosSemanaAnterior);
    if (Math.abs(tendenciaSemanal) > 30) {
      insights.push({
        tipo: tendenciaSemanal > 0 ? 'aviso' : 'positivo',
        icone: 'activity',
        titulo: 'Variação Semanal',
        descricao: tendenciaSemanal > 0 
          ? `Esta semana você gastou ${tendenciaSemanal.toFixed(1)}% a mais que a semana passada.`
          : `Esta semana você economizou ${Math.abs(tendenciaSemanal).toFixed(1)}% comparado à semana passada.`,
        valor: tendenciaSemanal,
        prioridade: tendenciaSemanal > 0 ? 'media' : 'baixa'
      });
    }

    // Gerar análise com IA (se configurado)
    let analiseIA = null;
    try {
      analiseIA = await gerarAnaliseFinanceira({
        gastosMes: totalGastosMes,
        gastosMesAnterior: totalGastosMesAnterior,
        tendenciaGastos,
        mediaDiaria: mediaDiariaGastos,
        projecaoMes: projecaoGastosMes,
        entradasMes: totalEntradasMes,
        taxaPoupanca,
        categorias: gastosPorCategoria.map(c => ({
          nome: c._id || 'Sem categoria',
          total: c.total,
          percentual: totalGastosMes > 0 ? (c.total / totalGastosMes) * 100 : 0
        }))
      }, 'financeiro');
    } catch (e) { console.error('Erro ao gerar análise IA:', e); }

    res.json({
      success: true,
      resumo: {
        gastos: {
          mesAtual: totalGastosMes,
          mesAnterior: totalGastosMesAnterior,
          tendencia: tendenciaGastos,
          semanaAtual: totalGastosSemana,
          mediaDiaria: mediaDiariaGastos,
          projecaoMes: projecaoGastosMes
        },
        entradas: {
          mesAtual: totalEntradasMes,
          mesAnterior: totalEntradasMesAnterior,
          tendencia: calcularTendencia(totalEntradasMes, totalEntradasMesAnterior)
        },
        balanco: {
          mesAtual: balancoMes,
          mesAnterior: balancoMesAnterior,
          taxaPoupanca
        },
        categorias: gastosPorCategoria.map(c => ({
          nome: c._id || 'Sem categoria',
          total: c.total,
          percentual: totalGastosMes > 0 ? (c.total / totalGastosMes) * 100 : 0
        })),
        padraoDiaSemana: gastosPorDiaSemana.map(d => ({
          dia: diasSemana[d._id - 1],
          total: d.total,
          transacoes: d.count
        }))
      },
      insights,
      analiseIA,
      geradoEm: new Date()
    });

  } catch (error) {
    console.error('Erro ao gerar insights financeiros:', error);
    res.status(500).json({ error: 'Erro ao gerar insights', details: error.message });
  }
};

// ==================== INSIGHTS DE PRODUTIVIDADE ====================

const getInsightsProdutividade = async (req, res) => {
  try {
    const userId = req.usuario._id;
    const mesAtual = getPeriodoDatas(30);
    const mesAnterior = { start: new Date(mesAtual.start), end: new Date(mesAtual.start) };
    mesAnterior.start.setDate(mesAnterior.start.getDate() - 30);

    // Atividades
    const atividadesMes = await Atividade.find({
      usuario: userId,
      createdAt: { $gte: mesAtual.start, $lte: mesAtual.end }
    });

    const atividadesMesAnterior = await Atividade.find({
      usuario: userId,
      createdAt: { $gte: mesAnterior.start, $lt: mesAnterior.end }
    });

    // Estatísticas de atividades
    const totalAtividades = atividadesMes.length;
    const realizadas = atividadesMes.filter(a => a.status === 'realizada').length;
    const pendentes = atividadesMes.filter(a => a.status === 'pendente').length;
    const emAndamento = atividadesMes.filter(a => a.status === 'em_andamento').length;
    const taxaConclusao = totalAtividades > 0 ? (realizadas / totalAtividades) * 100 : 0;

    const totalAnterior = atividadesMesAnterior.length;
    const realizadasAnterior = atividadesMesAnterior.filter(a => a.status === 'realizada').length;
    const taxaAnterior = totalAnterior > 0 ? (realizadasAnterior / totalAnterior) * 100 : 0;

    // NOTA: Hábitos foram migrados para Gastos
    // Valores zerados para compatibilidade
    const habitos = [];
    const habitosAtivos = 0;
    const mediaStreak = 0;
    const maxStreak = 0;

    // Insights
    const insights = [];

    // Taxa de conclusão
    if (taxaConclusao >= 80) {
      insights.push({
        tipo: 'positivo',
        icone: 'check-circle',
        titulo: 'Alta Produtividade!',
        descricao: `Você completou ${taxaConclusao.toFixed(1)}% das suas atividades este mês. Excelente trabalho!`,
        valor: taxaConclusao,
        prioridade: 'baixa'
      });
    } else if (taxaConclusao < 50 && totalAtividades > 5) {
      insights.push({
        tipo: 'aviso',
        icone: 'alert-triangle',
        titulo: 'Produtividade em Baixa',
        descricao: `Apenas ${taxaConclusao.toFixed(1)}% das atividades foram concluídas. Tente dividir tarefas maiores em menores.`,
        valor: taxaConclusao,
        prioridade: 'alta'
      });
    }

    // Tendência de produtividade
    const tendenciaProd = calcularTendencia(taxaConclusao, taxaAnterior);
    if (Math.abs(tendenciaProd) > 15) {
      insights.push({
        tipo: tendenciaProd > 0 ? 'positivo' : 'aviso',
        icone: tendenciaProd > 0 ? 'trending-up' : 'trending-down',
        titulo: tendenciaProd > 0 ? 'Produtividade Crescente' : 'Queda de Produtividade',
        descricao: tendenciaProd > 0
          ? `Sua taxa de conclusão aumentou ${tendenciaProd.toFixed(1)}% comparado ao mês anterior!`
          : `Sua taxa de conclusão caiu ${Math.abs(tendenciaProd).toFixed(1)}% comparado ao mês anterior.`,
        valor: tendenciaProd,
        prioridade: tendenciaProd > 0 ? 'baixa' : 'media'
      });
    }

    // Hábitos
    if (maxStreak >= 7) {
      insights.push({
        tipo: 'positivo',
        icone: 'flame',
        titulo: 'Sequência Impressionante!',
        descricao: `Você tem um hábito com sequência de ${maxStreak} dias! Consistência é a chave do sucesso.`,
        valor: maxStreak,
        prioridade: 'baixa'
      });
    }

    if (pendentes > realizadas && pendentes > 5) {
      insights.push({
        tipo: 'info',
        icone: 'list',
        titulo: 'Muitas Pendências',
        descricao: `Você tem ${pendentes} atividades pendentes. Considere priorizar ou reorganizar suas tarefas.`,
        valor: pendentes,
        prioridade: 'media'
      });
    }

    // Gerar análise com IA
    let analiseIA = null;
    try {
      analiseIA = await gerarAnaliseFinanceira({
        atividadesTotal: totalAtividades,
        atividadesRealizadas: realizadas,
        atividadesPendentes: pendentes,
        atividadesEmAndamento: emAndamento,
        taxaConclusao,
        tendencia: tendenciaProd,
        habitosTotal: habitos.length,
        habitosAtivos,
        maxStreak
      }, 'produtividade');
    } catch (e) { console.error('Erro ao gerar análise IA:', e); }

    res.json({
      success: true,
      resumo: {
        atividades: {
          total: totalAtividades,
          realizadas,
          pendentes,
          emAndamento,
          taxaConclusao,
          tendencia: tendenciaProd
        },
        habitos: {
          total: habitos.length,
          ativos: habitosAtivos,
          mediaStreak,
          maxStreak
        }
      },
      insights,
      analiseIA,
      geradoEm: new Date()
    });

  } catch (error) {
    console.error('Erro ao gerar insights de produtividade:', error);
    res.status(500).json({ error: 'Erro ao gerar insights', details: error.message });
  }
};

// ==================== INSIGHTS DE METAS ====================

const getInsightsMetas = async (req, res) => {
  try {
    const userId = req.usuario._id;
    
    const metas = await Meta.find({ usuario: userId });
    
    const total = metas.length;
    const concluidas = metas.filter(m => m.status === 'concluida').length;
    const emAndamento = metas.filter(m => m.status === 'em_andamento').length;
    const pendentes = metas.filter(m => m.status === 'pendente').length;
    const atrasadas = metas.filter(m => {
      if (m.dataFim && m.status !== 'concluida') {
        return new Date(m.dataFim) < new Date();
      }
      return false;
    }).length;

    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;

    // Metas próximas do prazo (7 dias)
    const proximasSemana = metas.filter(m => {
      if (m.dataFim && m.status !== 'concluida') {
        const diff = (new Date(m.dataFim) - new Date()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 7;
      }
      return false;
    });

    const insights = [];

    if (atrasadas > 0) {
      insights.push({
        tipo: 'critico',
        icone: 'alert-circle',
        titulo: 'Metas Atrasadas',
        descricao: `Você tem ${atrasadas} meta(s) com prazo vencido. Reavalie os prazos ou priorize a conclusão.`,
        valor: atrasadas,
        prioridade: 'critica'
      });
    }

    if (proximasSemana.length > 0) {
      insights.push({
        tipo: 'aviso',
        icone: 'clock',
        titulo: 'Prazos Próximos',
        descricao: `${proximasSemana.length} meta(s) vencem nos próximos 7 dias: ${proximasSemana.map(m => m.titulo).join(', ')}.`,
        valor: proximasSemana.length,
        prioridade: 'alta'
      });
    }

    if (taxaConclusao >= 70) {
      insights.push({
        tipo: 'positivo',
        icone: 'trophy',
        titulo: 'Ótimo Progresso em Metas!',
        descricao: `Você já concluiu ${taxaConclusao.toFixed(1)}% das suas metas. Continue focado!`,
        valor: taxaConclusao,
        prioridade: 'baixa'
      });
    }

    if (emAndamento === 0 && pendentes > 0) {
      insights.push({
        tipo: 'info',
        icone: 'play',
        titulo: 'Comece Suas Metas',
        descricao: `Você tem ${pendentes} metas pendentes. Que tal começar uma hoje?`,
        valor: pendentes,
        prioridade: 'media'
      });
    }

    res.json({
      success: true,
      resumo: {
        total,
        concluidas,
        emAndamento,
        pendentes,
        atrasadas,
        taxaConclusao,
        proximasSemana: proximasSemana.length
      },
      insights,
      geradoEm: new Date()
    });

    // Gerar análise com IA
    let analiseIA = null;
    try {
      analiseIA = await gerarAnaliseFinanceira({
        total,
        concluidas,
        emAndamento,
        pendentes,
        atrasadas,
        taxaConclusao,
        proximasSemana: proximasSemana.length
      }, 'metas');
    } catch (e) { console.error('Erro ao gerar análise IA:', e); }

    res.json({
      success: true,
      resumo: {
        total,
        concluidas,
        emAndamento,
        pendentes,
        atrasadas,
        taxaConclusao,
        proximasSemana: proximasSemana.length
      },
      insights,
      analiseIA,
      geradoEm: new Date()
    });

  } catch (error) {
    console.error('Erro ao gerar insights de metas:', error);
    res.status(500).json({ error: 'Erro ao gerar insights', details: error.message });
  }
};

// ==================== INSIGHTS COMPLETOS ====================

const getTodosInsights = async (req, res) => {
  try {
    const userId = req.usuario._id;
    
    // Simular as 3 chamadas
    const mockReq = { usuario: { _id: userId } };
    const financeiro = { json: (d) => d };
    const produtividade = { json: (d) => d };
    const metas = { json: (d) => d };

    // Executar análises em paralelo
    const [finResult, prodResult, metasResult] = await Promise.all([
      new Promise(async (resolve) => {
        try {
          const mesAtual = getPeriodoDatas(30);
          const gastos = await Gasto.aggregate([
            { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
          ]);
          const entradas = await Entrada.aggregate([
            { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
          ]);
          resolve({
            gastos: gastos[0]?.total || 0,
            entradas: entradas[0]?.total || 0,
            balanco: (entradas[0]?.total || 0) - (gastos[0]?.total || 0)
          });
        } catch (e) { resolve({ gastos: 0, entradas: 0, balanco: 0 }); }
      }),
      new Promise(async (resolve) => {
        try {
          const atividades = await Atividade.find({ usuario: userId });
          const realizadas = atividades.filter(a => a.status === 'realizada').length;
          resolve({
            total: atividades.length,
            realizadas,
            taxa: atividades.length > 0 ? (realizadas / atividades.length) * 100 : 0
          });
        } catch (e) { resolve({ total: 0, realizadas: 0, taxa: 0 }); }
      }),
      new Promise(async (resolve) => {
        try {
          const metasList = await Meta.find({ usuario: userId });
          const concluidas = metasList.filter(m => m.status === 'concluida').length;
          resolve({
            total: metasList.length,
            concluidas,
            taxa: metasList.length > 0 ? (concluidas / metasList.length) * 100 : 0
          });
        } catch (e) { resolve({ total: 0, concluidas: 0, taxa: 0 }); }
      })
    ]);

    // Score geral (0-100)
    const taxaPoupanca = finResult.entradas > 0 ? (finResult.balanco / finResult.entradas) * 100 : 0;
    const scorePoupanca = Math.max(0, Math.min(100, taxaPoupanca * 2)); // 50% poupança = 100 pontos
    const scoreProdutividade = prodResult.taxa;
    const scoreMetas = metasResult.taxa;
    
    const scoreGeral = Math.round((scorePoupanca * 0.4) + (scoreProdutividade * 0.35) + (scoreMetas * 0.25));

    // Determinar status
    let statusGeral = 'excelente';
    let mensagemStatus = 'Você está indo muito bem! Continue assim.';
    if (scoreGeral < 40) {
      statusGeral = 'precisa_atencao';
      mensagemStatus = 'Há áreas que precisam de atenção. Veja os insights abaixo.';
    } else if (scoreGeral < 70) {
      statusGeral = 'bom';
      mensagemStatus = 'Você está no caminho certo, mas pode melhorar.';
    }

    // Dica do dia - tentar gerar com IA primeiro
    let dicaDoDia = null;
    try {
      dicaDoDia = await gerarDicaDoDia({
        balanco: finResult.balanco,
        taxaPoupanca,
        atividadesPendentes: prodResult.total - prodResult.realizadas,
        metasAtrasadas: 0 // simplificado
      });
    } catch (e) { console.error('Erro ao gerar dica IA:', e); }

    // Fallback para dicas estáticas
    if (!dicaDoDia) {
      const dicas = [
        '💡 Revise seus gastos semanalmente para manter o controle.',
        '🎯 Defina metas SMART: Específicas, Mensuráveis, Alcançáveis, Relevantes e Temporais.',
        '🏦 Tente automatizar suas poupanças definindo uma transferência automática.',
        '📋 Divida grandes projetos em tarefas menores e mais gerenciáveis.',
        '🎉 Celebre pequenas vitórias para manter a motivação.',
        '⏰ Reserve 10 minutos por dia para revisar seu progresso.',
        '📊 Priorize tarefas usando a matriz de Eisenhower.',
        '💰 Mantenha um fundo de emergência de 3-6 meses de despesas.'
      ];
      dicaDoDia = dicas[Math.floor(Math.random() * dicas.length)];
    }

    // Gerar análise geral com IA
    let analiseIA = null;
    try {
      analiseIA = await gerarAnaliseFinanceira({
        entradas: finResult.entradas,
        gastos: finResult.gastos,
        balanco: finResult.balanco,
        taxaPoupanca,
        score: scoreGeral,
        atividadesConcluidas: prodResult.realizadas,
        atividadesTotal: prodResult.total,
        metasConcluidas: metasResult.concluidas,
        metasTotal: metasResult.total
      }, 'geral');
    } catch (e) { console.error('Erro ao gerar análise IA geral:', e); }

    res.json({
      success: true,
      scoreGeral,
      statusGeral,
      mensagemStatus,
      resumoRapido: {
        financeiro: {
          gastosMes: finResult.gastos,
          entradasMes: finResult.entradas,
          balancoMes: finResult.balanco,
          taxaPoupanca: Math.max(0, taxaPoupanca)
        },
        produtividade: {
          atividadesTotal: prodResult.total,
          atividadesRealizadas: prodResult.realizadas,
          taxaConclusao: prodResult.taxa
        },
        metas: {
          total: metasResult.total,
          concluidas: metasResult.concluidas,
          taxaConclusao: metasResult.taxa
        }
      },
      dicaDoDia,
      analiseIA,
      geradoEm: new Date()
    });

  } catch (error) {
    console.error('Erro ao gerar todos os insights:', error);
    res.status(500).json({ error: 'Erro ao gerar insights', details: error.message });
  }
};

// ==================== CHAT COM ASSISTENTE IA ====================

const chatIA = async (req, res) => {
  try {
    const userId = req.usuario._id;
    const { mensagem } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Buscar TODOS os dados do utilizador
    const mesAtual = getPeriodoDatas(30);
    
    const [
      // Gastos agregados
      gastosAgregados,
      // Gastos por categoria
      gastosPorCategoria,
      // Gastos recentes (últimos 10)
      gastosRecentes,
      // Entradas agregadas
      entradasAgregadas,
      // Entradas recentes (últimas 10)
      entradasRecentes,
      // Todas as atividades
      atividadesData,
      // Todas as metas
      metasData,
      // Todos os projetos
      projetosData
    ] = await Promise.all([
      // Gastos agregados do mês
      Gasto.aggregate([
        { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      // Gastos por categoria
      Gasto.aggregate([
        { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
        { $group: { _id: '$categoria', total: { $sum: '$valor' }, count: { $sum: 1 } } },
        { $project: { categoria: '$_id', total: 1, count: 1, _id: 0 } },
        { $sort: { total: -1 } }
      ]),
      // Últimos 10 gastos
      Gasto.find({ usuario: userId })
        .sort({ data: -1 })
        .limit(10)
        .select('titulo valor categoria data area'),
      // Entradas agregadas do mês
      Entrada.aggregate([
        { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: mesAtual.start, $lte: mesAtual.end } } },
        { $group: { _id: null, total: { $sum: '$valor' }, count: { $sum: 1 } } }
      ]),
      // Últimas 10 entradas
      Entrada.find({ usuario: userId })
        .sort({ data: -1 })
        .limit(10)
        .select('titulo valor categoria data fonte'),
      // Todas as atividades do utilizador
      Atividade.find({ usuario: userId })
        .sort({ data: -1 })
        .select('titulo status prioridade data area'),
      // Todas as metas do utilizador
      Meta.find({ usuario: userId })
        .select('titulo descricao valorAlvo valorAtual status dataLimite'),
      // Todos os projetos do utilizador
      Projeto.find({ usuario: userId })
        .select('titulo descricao cumprido dataProjecto')
    ]);

    // Calcular totais
    const gastosMes = gastosAgregados[0]?.total || 0;
    const entradasMes = entradasAgregadas[0]?.total || 0;
    const balancoMes = entradasMes - gastosMes;
    const taxaPoupanca = entradasMes > 0 ? (balancoMes / entradasMes) * 100 : 0;

    // Construir contexto completo
    const contexto = {
      // Financeiro
      gastosMes,
      entradasMes,
      balancoMes,
      taxaPoupanca,
      gastosPorCategoria,
      gastosRecentes,
      entradasRecentes,
      
      // Atividades
      atividadesTotal: atividadesData.length,
      atividadesRealizadas: atividadesData.filter(a => a.status === 'realizada').length,
      atividadesPendentes: atividadesData.filter(a => a.status === 'pendente').length,
      atividadesEmAndamento: atividadesData.filter(a => a.status === 'em_andamento').length,
      atividadesLista: atividadesData.filter(a => a.status !== 'realizada').slice(0, 10),
      
      // Metas
      metasTotal: metasData.length,
      metasConcluidas: metasData.filter(m => m.status === 'concluida').length,
      metasEmAndamento: metasData.filter(m => m.status === 'em_andamento').length,
      metasLista: metasData,
      
      // Projetos
      projetosTotal: projetosData.length,
      projetosCumpridos: projetosData.filter(p => p.cumprido).length,
      projetosPendentes: projetosData.filter(p => !p.cumprido).length,
      projetosLista: projetosData
    };

    const resposta = await chatComAssistente(mensagem, contexto);

    res.json({
      success: true,
      resposta,
      contexto: {
        gastosMes,
        entradasMes,
        balancoMes,
        taxaPoupanca
      }
    });

  } catch (error) {
    console.error('Erro no chat IA:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem', details: error.message });
  }
};

module.exports = {
  getInsightsFinanceiros,
  getInsightsProdutividade,
  getInsightsMetas,
  getTodosInsights,
  chatIA
};
