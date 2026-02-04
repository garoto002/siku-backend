const express = require('express');
const router = express.Router();
const {
  listarAreas,
  criarArea,
  atualizarArea,
  excluirArea,
  contarVinculosArea,
  listarVinculosArea,
  reassignArea
} = require('../controllers/areaController');

const { protegerRota } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protegerRota);

router.route('/')
  .get(listarAreas)
  .post(criarArea);

router.route('/:id')
  .get(contarVinculosArea)
  .put(atualizarArea)
  .delete(excluirArea);

// listar lançamentos vinculados (gastos + entradas)
router.get('/:id/lancamentos', listarVinculosArea);

// Reatribuir lançamentos desta área para outra
router.post('/:id/reassign', reassignArea);

module.exports = router;
