const express = require('express');
const router = express.Router();
const {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  contarVinculosCategoria,
  listarVinculosCategoria,
  reassignCategoria
} = require('../controllers/categoriaController');

const { protegerRota } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protegerRota);

router.route('/')
  .get(listarCategorias)
  .post(criarCategoria);

router.route('/:id')
  .get(contarVinculosCategoria)
  .put(atualizarCategoria)
  .delete(excluirCategoria);

// listar lançamentos vinculados (gastos + entradas)
router.get('/:id/lancamentos', listarVinculosCategoria);

// Reatribuir lançamentos desta categoria para outra
router.post('/:id/reassign', reassignCategoria);

module.exports = router;
