const Categoria = require('../models/Categoria');
const Area = require('../models/Area');

// @desc    Listar todas as categorias de uma área
// @route   GET /api/categorias?area=:areaId
// @access  Private
const listarCategorias = async (req, res) => {
  try {
    const { area } = req.query;

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'ID da área é obrigatório'
      });
    }

    // Verificar se a área existe e pertence ao usuário
    const areaExistente = await Area.findOne({
      _id: area,
      usuario: req.usuario.id
    });

    if (!areaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    const categorias = await Categoria.find({
      area: area,
      usuario: req.usuario.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: categorias,
      count: categorias.length
    });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Criar uma nova categoria
// @route   POST /api/categorias
// @access  Private
const criarCategoria = async (req, res) => {
  try {
    const { nome, area, cor } = req.body;

    if (!nome || !area) {
      return res.status(400).json({
        success: false,
        message: 'Nome e área são obrigatórios'
      });
    }

    // Verificar se a área existe e pertence ao usuário
    const areaExistente = await Area.findOne({
      _id: area,
      usuario: req.usuario.id
    });

    if (!areaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Área não encontrada'
      });
    }

    // Verificar se já existe uma categoria com esse nome nesta área
    const categoriaExistente = await Categoria.findOne({
      nome: nome.trim(),
      area: area,
      usuario: req.usuario.id
    });

    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma categoria com este nome nesta área'
      });
    }

    const categoria = await Categoria.create({
      nome: nome.trim(),
      area: area,
      cor: cor || '#10B981',
      usuario: req.usuario.id
    });

    res.status(201).json({
      success: true,
      data: categoria,
      message: 'Categoria criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);

    // Tratamento específico para erro de índice único
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma categoria com este nome nesta área'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Atualizar uma categoria
// @route   PUT /api/categorias/:id
// @access  Private
const atualizarCategoria = async (req, res) => {
  try {
    const { nome, cor } = req.body;
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOne({
      _id: categoriaId,
      usuario: req.usuario.id
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    categoria.nome = nome?.trim() || categoria.nome;
    categoria.cor = cor || categoria.cor;

    await categoria.save();

    res.status(200).json({
      success: true,
      data: categoria,
      message: 'Categoria atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Excluir uma categoria
// @route   DELETE /api/categorias/:id
// @access  Private
const excluirCategoria = async (req, res) => {
  try {
    const categoriaId = req.params.id;

    const categoria = await Categoria.findOneAndDelete({
      _id: categoriaId,
      usuario: req.usuario.id
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria
};
