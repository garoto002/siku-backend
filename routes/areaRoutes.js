const express = require('express');
const router = express.Router();
const {
  listarAreas,
  criarArea,
  atualizarArea,
  excluirArea
} = require('../controllers/areaController');

const { protegerRota } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protegerRota);

router.route('/')
  .get(listarAreas)
  .post(criarArea);

router.route('/:id')
  .put(atualizarArea)
  .delete(excluirArea);

module.exports = router;
