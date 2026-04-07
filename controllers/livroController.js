const Livro = require('../models/Livro');
const mongoose = require('mongoose');
const { requireAuth, filterFields, devLog } = require('../utils/helpers');

// Listar todos os livros do usuário
const listarLivros = async (req, res) => {
  try {
    devLog('🔎 [Livro] Listando livros para usuário:', req.usuario?._id || req.usuario?.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { status, busca, page = 1, limit = 50 } = req.query;
    const filtro = { usuario: usuarioId };

    // Filtro por status
    if (status && ['planeado', 'lendo', 'concluido', 'abandonado'].includes(status)) {
      filtro.status = status;
    }

    // Filtro por busca (título ou autor)
    if (busca) {
      filtro.$or = [
        { titulo: { $regex: busca, $options: 'i' } },
        { autor: { $regex: busca, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const livros = await Livro.find(filtro)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Livro.countDocuments(filtro);
    
    res.json({ 
      success: true, 
      livros,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('❌ [Livro] Erro ao listar livros:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar livros', error: error.message });
  }
};

// Criar novo livro
const criarLivro = async (req, res) => {
  try {
    devLog('📚 [Livro] Criando livro:', req.body);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const dadosLivro = {
      ...req.body,
      usuario: usuarioId
    };

    // Se começou a ler, definir dataInicio
    if (dadosLivro.status === 'lendo' && !dadosLivro.dataInicio) {
      dadosLivro.dataInicio = new Date();
    }

    // Se concluído, definir dataConclusao
    if (dadosLivro.status === 'concluido' && !dadosLivro.dataConclusao) {
      dadosLivro.dataConclusao = new Date();
    }

    const livro = new Livro(dadosLivro);
    await livro.save();

    devLog('✅ [Livro] Livro criado:', livro._id);
    res.status(201).json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao criar livro:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar livro', error: error.message });
  }
};

// Obter livro por ID
const obterLivro = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id } = req.params;
    const livro = await Livro.findOne({ _id: id, usuario: usuarioId });

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    res.json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao obter livro:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter livro', error: error.message });
  }
};

// Atualizar livro
const atualizarLivro = async (req, res) => {
  try {
    devLog('📝 [Livro] Atualizando livro:', req.params.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id } = req.params;
    const dadosAtualizacao = { ...req.body };

    // Gerenciar datas baseado no status
    if (dadosAtualizacao.status === 'lendo') {
      const livroAtual = await Livro.findById(id);
      if (livroAtual && livroAtual.status === 'planeado' && !dadosAtualizacao.dataInicio) {
        dadosAtualizacao.dataInicio = new Date();
      }
    }

    if (dadosAtualizacao.status === 'concluido' && !dadosAtualizacao.dataConclusao) {
      dadosAtualizacao.dataConclusao = new Date();
    }

    const livro = await Livro.findOneAndUpdate(
      { _id: id, usuario: usuarioId },
      dadosAtualizacao,
      { new: true, runValidators: true }
    );

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    devLog('✅ [Livro] Livro atualizado:', livro._id);
    res.json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao atualizar livro:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar livro', error: error.message });
  }
};

// Excluir livro
const excluirLivro = async (req, res) => {
  try {
    devLog('🗑️ [Livro] Excluindo livro:', req.params.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id } = req.params;
    const livro = await Livro.findOneAndDelete({ _id: id, usuario: usuarioId });

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    devLog('✅ [Livro] Livro excluído:', id);
    res.json({ success: true, message: 'Livro excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Livro] Erro ao excluir livro:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir livro', error: error.message });
  }
};

// Adicionar resumo diário
const adicionarResumo = async (req, res) => {
  try {
    devLog('📝 [Livro] Adicionando resumo ao livro:', req.params.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id } = req.params;
    const { conteudo, paginaInicio, paginaFim, ideiasPrincipais } = req.body;

    if (!conteudo) {
      return res.status(400).json({ success: false, message: 'Conteúdo do resumo é obrigatório' });
    }

    const resumo = {
      data: new Date(),
      conteudo,
      paginaInicio,
      paginaFim,
      ideiasPrincipais: ideiasPrincipais || []
    };

    const livro = await Livro.findOneAndUpdate(
      { _id: id, usuario: usuarioId },
      { 
        $push: { resumosDiarios: resumo },
        $set: { paginaAtual: paginaFim || undefined }
      },
      { new: true, runValidators: true }
    );

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    devLog('✅ [Livro] Resumo adicionado ao livro:', livro._id);
    res.json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao adicionar resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar resumo', error: error.message });
  }
};

// Atualizar resumo específico
const atualizarResumo = async (req, res) => {
  try {
    devLog('📝 [Livro] Atualizando resumo:', req.params.resumoId);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id, resumoId } = req.params;
    const { conteudo, paginaInicio, paginaFim, ideiasPrincipais } = req.body;

    const livro = await Livro.findOneAndUpdate(
      { _id: id, usuario: usuarioId, 'resumosDiarios._id': resumoId },
      { 
        $set: { 
          'resumosDiarios.$.conteudo': conteudo,
          'resumosDiarios.$.paginaInicio': paginaInicio,
          'resumosDiarios.$.paginaFim': paginaFim,
          'resumosDiarios.$.ideiasPrincipais': ideiasPrincipais || []
        }
      },
      { new: true, runValidators: true }
    );

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro ou resumo não encontrado' });
    }

    res.json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao atualizar resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar resumo', error: error.message });
  }
};

// Excluir resumo específico
const excluirResumo = async (req, res) => {
  try {
    devLog('🗑️ [Livro] Excluindo resumo:', req.params.resumoId);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id, resumoId } = req.params;

    const livro = await Livro.findOneAndUpdate(
      { _id: id, usuario: usuarioId },
      { $pull: { resumosDiarios: { _id: resumoId } } },
      { new: true }
    );

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    res.json({ success: true, livro, message: 'Resumo excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Livro] Erro ao excluir resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir resumo', error: error.message });
  }
};

// Estatísticas de leitura
const estatisticas = async (req, res) => {
  try {
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const stats = await Livro.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(usuarioId) } },
      {
        $group: {
          _id: null,
          totalLivros: { $sum: 1 },
          livrosPlaneados: { $sum: { $cond: [{ $eq: ['$status', 'planeado'] }, 1, 0] } },
          livrosLendo: { $sum: { $cond: [{ $eq: ['$status', 'lendo'] }, 1, 0] } },
          livrosConcluidos: { $sum: { $cond: [{ $eq: ['$status', 'concluido'] }, 1, 0] } },
          livrosAbandonados: { $sum: { $cond: [{ $eq: ['$status', 'abandonado'] }, 1, 0] } },
          totalPaginasLidas: { $sum: '$paginaAtual' },
          totalResumos: { $sum: { $size: { $ifNull: ['$resumosDiarios', []] } } },
          mediaNotas: { $avg: { $cond: [{ $gt: ['$nota', 0] }, '$nota', null] } }
        }
      }
    ]);

    // Livros concluídos este mês
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const livrosMes = await Livro.countDocuments({
      usuario: usuarioId,
      status: 'concluido',
      dataConclusao: { $gte: inicioMes }
    });

    const resultado = stats[0] || {
      totalLivros: 0,
      livrosPlaneados: 0,
      livrosLendo: 0,
      livrosConcluidos: 0,
      livrosAbandonados: 0,
      totalPaginasLidas: 0,
      totalResumos: 0,
      mediaNotas: 0
    };

    resultado.livrosConcluidosMes = livrosMes;

    res.json({ success: true, estatisticas: resultado });
  } catch (error) {
    console.error('❌ [Livro] Erro ao obter estatísticas:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas', error: error.message });
  }
};

// Atualizar progresso de leitura
const atualizarProgresso = async (req, res) => {
  try {
    devLog('📖 [Livro] Atualizando progresso:', req.params.id);
    const usuarioId = requireAuth(req, res);
    if (!usuarioId) return;

    const { id } = req.params;
    const { paginaAtual } = req.body;

    if (paginaAtual === undefined || paginaAtual < 0) {
      return res.status(400).json({ success: false, message: 'Página atual inválida' });
    }

    const livro = await Livro.findOneAndUpdate(
      { _id: id, usuario: usuarioId },
      { paginaAtual },
      { new: true, runValidators: true }
    );

    if (!livro) {
      return res.status(404).json({ success: false, message: 'Livro não encontrado' });
    }

    // Verificar se concluiu o livro
    if (livro.totalPaginas > 0 && livro.paginaAtual >= livro.totalPaginas && livro.status !== 'concluido') {
      livro.status = 'concluido';
      livro.dataConclusao = new Date();
      await livro.save();
    }

    res.json({ success: true, livro });
  } catch (error) {
    console.error('❌ [Livro] Erro ao atualizar progresso:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar progresso', error: error.message });
  }
};

module.exports = {
  listarLivros,
  criarLivro,
  obterLivro,
  atualizarLivro,
  excluirLivro,
  adicionarResumo,
  atualizarResumo,
  excluirResumo,
  estatisticas,
  atualizarProgresso
};
