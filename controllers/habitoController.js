// NOTA: Este controller agora usa o modelo Gasto para manter compatibilidade
// com apps antigos que ainda chamam /api/habitos
const Gasto = require('../models/Gasto');

const listarHabitos = async (req, res) => {
  try {
    console.log('🔎 [Habito->Gasto] Listando gastos para usuário:', req.usuario?._id || req.usuario?.id || 'não autenticado');
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());

    if (!usuarioId) {
      console.log('❌ [Habito->Gasto] Usuário não autenticado');
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

    const gastos = await Gasto.find(filtro).sort({ data: 1 });
    // Retorna como 'habitos' para compatibilidade com apps antigos
    res.json({ success: true, habitos: gastos, gastos: gastos });
  } catch (error) {
    console.error('❌ [Habito->Gasto] Erro ao listar:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar gastos', error });
  }
};

const criarHabito = async (req, res) => {
  try {
    console.log('📥 [Habito->Gasto] Dados recebidos:', req.body);
    console.log('🔑 [Habito->Gasto] Usuário:', req.usuario?._id || req.usuario?.id || 'não autenticado');

    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());

    if (!usuarioId) {
      console.log('❌ [Habito->Gasto] Usuário não autenticado');
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // Validação dos campos obrigatórios
    if (!req.body.area || !req.body.categoria || typeof req.body.valor === 'undefined') {
      return res.status(400).json({ success: false, message: 'Área, categoria e valor são obrigatórios' });
    }
    
    const novoGasto = new Gasto({ ...req.body, usuario: usuarioId });
    await novoGasto.save();
    console.log('✅ [Habito->Gasto] Gasto salvo com sucesso:', novoGasto);
    // Retorna como 'habito' para compatibilidade com apps antigos
    res.json({ success: true, habito: novoGasto, gasto: novoGasto });
  } catch (error) {
    console.error('❌ [Habito->Gasto] Erro ao criar:', error);
    res.status(400).json({ success: false, message: 'Erro ao criar gasto', error });
  }
};

const obterHabito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());
    const gasto = await Gasto.findOne({ _id: req.params.id, usuario: usuarioId });
    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
    res.json({ success: true, data: gasto, habito: gasto, gasto: gasto });
  } catch (error) {
    console.error('❌ [Habito->Gasto] Erro ao obter:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter gasto', error });
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

    const gasto = await Gasto.findOneAndUpdate(
      { _id: req.params.id, usuario: usuarioId },
      updates,
      { new: true, runValidators: true }
    );

    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });

    res.json({ success: true, data: gasto, habito: gasto, gasto: gasto });
  } catch (error) {
    console.error('❌ [Habito->Gasto] Erro ao atualizar:', error);
    res.status(400).json({ success: false, message: 'Erro ao atualizar gasto', error });
  }
};

const excluirHabito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id || (req.usuario._id && req.usuario._id.toString());
    const gasto = await Gasto.findOneAndDelete({ _id: req.params.id, usuario: usuarioId });
    if (!gasto) return res.status(404).json({ success: false, message: 'Gasto não encontrado' });
    res.json({ success: true, message: 'Gasto excluído com sucesso' });
  } catch (error) {
    console.error('❌ [Habito->Gasto] Erro ao excluir:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir gasto', error });
  }
};

module.exports = {
  listarHabitos,
  criarHabito,
  obterHabito,
  atualizarHabito,
  excluirHabito
};
