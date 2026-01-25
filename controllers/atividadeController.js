const Atividade = require('../models/Atividade');
const mongoose = require('mongoose');

// Criar nova atividade
const criarAtividade = async (req, res) => {
  try {
    console.log('📝 Recebendo dados para criar atividade:', req.body);
    console.log('👤 Usuário autenticado:', req.usuario?.id);

    const { titulo, descricao, data, horaInicio, horaFim, prioridade, categoria, lembretes } = req.body;

    // Validar campos obrigatórios
    if (!titulo) {
      console.log('❌ Campo obrigatório faltando: titulo');
      return res.status(400).json({
        success: false,
        message: 'Título é obrigatório'
      });
    }

    // Para hábitos, usar data atual se não fornecida
    const dataParaUsar = data || new Date().toISOString().split('T')[0];

    // Validar e formatar data
    let dataFormatada;
    try {
      dataFormatada = new Date(dataParaUsar);
      if (isNaN(dataFormatada.getTime())) {
        throw new Error('Data inválida');
      }
      console.log('📅 Data formatada:', dataFormatada);
    } catch (error) {
      console.log('❌ Erro ao formatar data:', dataParaUsar, error.message);
      return res.status(400).json({
        success: false,
        message: 'Formato de data inválido. Use YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss'
      });
    }

    // Validar horários se fornecidos
    if (horaInicio && horaFim) {
      const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
      const [horaFimH, horaFimM] = horaFim.split(':').map(Number);
      
      const inicioMinutos = horaInicioH * 60 + horaInicioM;
      const fimMinutos = horaFimH * 60 + horaFimM;
      
      if (fimMinutos <= inicioMinutos) {
        return res.status(400).json({
          success: false,
          message: 'Horário de fim deve ser posterior ao horário de início'
        });
      }
    }

    // Criar atividade
    const atividade = new Atividade({
      titulo,
      descricao,
      data: dataFormatada,
      horaInicio,
      horaFim,
      prioridade: prioridade || 'media',
      categoria: categoria || 'Geral',
      lembretes: lembretes || [],
      usuario: req.usuario.id // ID do usuário autenticado
    });

    console.log('💾 Salvando atividade:', atividade);
    await atividade.save();
    console.log('✅ Atividade salva com sucesso!');

    res.status(201).json({
      success: true,
      message: 'Atividade criada com sucesso!',
      data: atividade
    });

  } catch (error) {
    console.error('❌ Erro ao criar atividade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar atividade',
      error: error.message
    });
  }
};

// Listar atividades do usuário
const listarAtividades = async (req, res) => {
  try {
    const { status, prioridade, categoria, dataInicio, dataFim, pagina = 1, limite = 10 } = req.query;

    // Construir filtro
    const filtro = { usuario: req.usuario.id };

    if (status) filtro.status = status;
    if (prioridade) filtro.prioridade = prioridade;
    if (categoria) {
      // Suporte para múltiplas categorias separadas por vírgula
      const categorias = categoria.split(',').map(cat => cat.trim());
      if (categorias.length > 1) {
        filtro.categoria = { $in: categorias };
      } else {
        filtro.categoria = categoria;
      }
    }

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

    // Calcular skip para paginação
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Buscar atividades
    const atividades = await Atividade.find(filtro)
      .sort({ data: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limite))
      .populate('usuario', 'nome email');

    // Contar total
    const total = await Atividade.countDocuments(filtro);

    res.status(200).json({
      success: true,
      data: {
        atividades,
        paginacao: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          paginas: Math.ceil(total / parseInt(limite))
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar atividades:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar atividades',
      error: error.message
    });
  }
};

// Buscar atividade por ID
const buscarAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findOne({
      _id: req.params.id,
      usuario: req.usuario.id
    });

    if (!atividade) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: atividade
    });

  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar atividade',
      error: error.message
    });
  }
};

// Atualizar atividade
const atualizarAtividade = async (req, res) => {
  try {
    const { titulo, descricao, data, hora, prioridade, status, categoria, lembretes } = req.body;

    const atividade = await Atividade.findOneAndUpdate(
      { _id: req.params.id, usuario: req.usuario.id },
      {
        titulo,
        descricao,
        data: data ? new Date(data) : undefined,
        hora,
        prioridade,
        status,
        categoria,
        lembretes
      },
      { new: true, runValidators: true }
    );

    if (!atividade) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Atividade atualizada com sucesso!',
      data: atividade
    });

  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar atividade',
      error: error.message
    });
  }
};

// Excluir atividade
const excluirAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findOneAndDelete({
      _id: req.params.id,
      usuario: req.usuario.id
    });

    if (!atividade) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Atividade excluída com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir atividade',
      error: error.message
    });
  }
};

// Obter estatísticas das atividades (otimizado)
const obterEstatisticas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const agora = new Date();

    // Agregação única para todas as estatísticas
    const stats = await Atividade.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(usuarioId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          concluidas: {
            $sum: { $cond: [{ $eq: ['$status', 'concluida'] }, 1, 0] }
          },
          pendentes: {
            $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] }
          },
          em_andamento: {
            $sum: { $cond: [{ $eq: ['$status', 'em_andamento'] }, 1, 0] }
          },
          atrasadas: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'concluida'] },
                    { $ne: ['$status', 'cancelada'] },
                    { $lt: ['$data', agora] }
                  ]
                },
                1,
                0
              ]
            }
          },
          porPrioridade: {
            $push: '$prioridade'
          },
          porCategoria: {
            $push: '$categoria'
          }
        }
      }
    ]);

    let geral = {
      total: 0,
      concluidas: 0,
      pendentes: 0,
      atrasadas: 0,
      taxaConclusao: '0.0'
    };

    let porPrioridade = [];
    let porCategoria = [];

    if (stats.length > 0) {
      const data = stats[0];
      geral = {
        total: data.total,
        concluidas: data.concluidas,
        pendentes: data.pendentes,
        atrasadas: data.atrasadas,
        taxaConclusao: data.total > 0 ? (data.concluidas / data.total * 100).toFixed(1) : '0.0'
      };

      // Processar contagens por prioridade
      const prioridadeCount = {};
      data.porPrioridade.forEach(prioridade => {
        prioridadeCount[prioridade] = (prioridadeCount[prioridade] || 0) + 1;
      });
      porPrioridade = Object.entries(prioridadeCount).map(([key, count]) => ({
        _id: key,
        count
      }));

      // Processar contagens por categoria
      const categoriaCount = {};
      data.porCategoria.forEach(categoria => {
        categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1;
      });
      porCategoria = Object.entries(categoriaCount).map(([key, count]) => ({
        _id: key,
        count
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        geral,
        porPrioridade,
        porCategoria
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
};

module.exports = {
  criarAtividade,
  listarAtividades,
  buscarAtividade,
  atualizarAtividade,
  excluirAtividade,
  obterEstatisticas
};