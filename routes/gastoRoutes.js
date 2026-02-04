const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const gastoController = require('../controllers/gastoController');
const { 
  validateGasto, 
  validateMongoId, 
  validateDateQuery,
  handleValidation 
} = require('../middleware/securityMiddleware');

router.get('/', protegerRota, validateDateQuery, handleValidation, gastoController.listarGastos);
router.post('/', protegerRota, validateGasto, handleValidation, gastoController.criarGasto);

// Totais / Relatórios (deve estar antes de rotas com :id)
router.get('/totais', protegerRota, validateDateQuery, handleValidation, gastoController.totaisGastos);

router.get('/:id', protegerRota, validateMongoId, handleValidation, gastoController.obterGasto);
router.put('/:id', protegerRota, validateMongoId, handleValidation, gastoController.atualizarGasto);
router.delete('/:id', protegerRota, validateMongoId, handleValidation, gastoController.excluirGasto);

module.exports = router;