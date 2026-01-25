const express = require('express');
const router = express.Router();
const {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria
} = require('../controllers/categoriaController');

const { protegerRota } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protegerRota);

router.route('/')
  .get(listarCategorias)
  .post(criarCategoria);

router.route('/:id')
  .put(atualizarCategoria)
  .delete(excluirCategoria);

module.exports = router;
