const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const orcamentoController = require('../controllers/orcamentoController');
const {
  validateOrcamento,
  validateMongoId,
  handleValidation
} = require('../middleware/securityMiddleware');

router.get('/', protegerRota, handleValidation, orcamentoController.listarOrcamentos);
router.post('/', protegerRota, validateOrcamento, handleValidation, orcamentoController.criarOrcamento);

// Comparar planeado vs real (deve estar antes de rotas com :id)
router.get('/comparar', protegerRota, handleValidation, orcamentoController.compararOrcamento);

router.get('/:id', protegerRota, validateMongoId, handleValidation, orcamentoController.obterOrcamento);
router.put('/:id', protegerRota, validateMongoId, handleValidation, orcamentoController.atualizarOrcamento);
router.delete('/:id', protegerRota, validateMongoId, handleValidation, orcamentoController.excluirOrcamento);

module.exports = router;
