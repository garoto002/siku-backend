const Area = require('../models/Area');

// @desc    Listar todas as áreas do usuário
// @route   GET /api/areas
// @access  Private
const listarAreas = async (req, res) => {
  try {
    const areas = await Area.find({ usuario: req.usuario.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: areas,
      count: areas.length
    });
  } catch (error) {
    console.error('Erro ao listar áreas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Criar uma nova área
// @route   POST /api/areas
// @access  Private
const criarArea = async (req, res) => {
  try {
    const { nome, cor } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome da área é obrigatório'
      });
    }

    // Verificar se já existe uma área com esse nome para o usuário
    const areaExistente = await Area.findOne({
      nome: nome.trim(),
      usuario: req.usuario.id
    });

    if (areaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma área com este nome'
      });
    }

    const area = await Area.create({
      nome: nome.trim(),
      cor: cor || '#3B82F6',
      usuario: req.usuario.id
    });

    res.status(201).json({
      success: true,
      data: area,
      message: 'Área criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar área:', error);

    // Tratamento específico para erro de índice único
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma área com este nome'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Atualizar uma área
// @route   PUT /api/areas/:id
// @access  Private
const atualizarArea = async (req, res) => {
  try {
    const { nome, cor } = req.body;
    const areaId = req.params.id;

    const area = await Area.findOne({
      _id: areaId,
      usuario: req.usuario.id
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    area.nome = nome?.trim() || area.nome;
    area.cor = cor || area.cor;

    await area.save();

    res.status(200).json({
      success: true,
      data: area,
      message: 'Área atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar área:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Excluir uma área
// @route   DELETE /api/areas/:id
// @access  Private
const excluirArea = async (req, res) => {
  try {
    const areaId = req.params.id;

    const area = await Area.findOneAndDelete({
      _id: areaId,
      usuario: req.usuario.id
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Área excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir área:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarAreas,
  criarArea,
  atualizarArea,
  excluirArea
};
