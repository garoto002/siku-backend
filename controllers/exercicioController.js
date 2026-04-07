const Exercicio = require('../models/Exercicio');

// Obter dados de exercício do usuário (ou criar se não existir)
exports.obterExercicio = async (req, res) => {
  try {
    let exercicio = await Exercicio.findOne({ usuario: req.usuario.id });
    if (!exercicio) {
      exercicio = await Exercicio.create({
        usuario: req.usuario.id,
        metaMensal: 20,
        metaSemanal: 5,
        diasTreinados: [],
        notas: {},
      });
    }
    res.status(200).json({ success: true, data: exercicio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter dados de exercício', error: error.message });
  }
};

// Atualizar metas de exercício
exports.atualizarMetas = async (req, res) => {
  try {
    const { metaMensal, metaSemanal } = req.body;
    let exercicio = await Exercicio.findOne({ usuario: req.usuario.id });
    if (!exercicio) {
      exercicio = await Exercicio.create({
        usuario: req.usuario.id,
        metaMensal: metaMensal || 20,
        metaSemanal: metaSemanal || 5,
        diasTreinados: [],
        notas: {},
      });
    } else {
      if (metaMensal !== undefined) exercicio.metaMensal = metaMensal;
      if (metaSemanal !== undefined) exercicio.metaSemanal = metaSemanal;
      await exercicio.save();
    }
    res.status(200).json({ success: true, data: exercicio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar metas', error: error.message });
  }
};

// Marcar/desmarcar dia de treino (toggle)
exports.toggleDia = async (req, res) => {
  try {
    const { data, nota } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Data é obrigatória (YYYY-MM-DD)' });
    }

    // Validar formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ success: false, message: 'Formato de data inválido. Use YYYY-MM-DD' });
    }

    let exercicio = await Exercicio.findOne({ usuario: req.usuario.id });
    if (!exercicio) {
      exercicio = await Exercicio.create({
        usuario: req.usuario.id,
        metaMensal: 20,
        metaSemanal: 5,
        diasTreinados: [data],
        notas: nota ? { [data]: nota } : {},
      });
    } else {
      const index = exercicio.diasTreinados.indexOf(data);
      if (index > -1) {
        // Desmarcar
        exercicio.diasTreinados.splice(index, 1);
        exercicio.notas.delete(data);
      } else {
        // Marcar
        exercicio.diasTreinados.push(data);
        if (nota) {
          exercicio.notas.set(data, nota);
        }
      }
      await exercicio.save();
    }

    res.status(200).json({ success: true, data: exercicio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar dia de treino', error: error.message });
  }
};

// Adicionar/atualizar nota de um dia
exports.atualizarNota = async (req, res) => {
  try {
    const { data, nota } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Data é obrigatória' });
    }

    let exercicio = await Exercicio.findOne({ usuario: req.usuario.id });
    if (!exercicio) {
      return res.status(404).json({ success: false, message: 'Dados de exercício não encontrados' });
    }

    if (nota) {
      exercicio.notas.set(data, nota);
    } else {
      exercicio.notas.delete(data);
    }
    await exercicio.save();

    res.status(200).json({ success: true, data: exercicio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar nota', error: error.message });
  }
};
