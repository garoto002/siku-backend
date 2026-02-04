const express = require('express');
const router = express.Router();

const entradaController = require('../controllers/entradaController');
const { protegerRota } = require('../middleware/authMiddleware');
const { 
  validateEntrada, 
  validateMongoId, 
  validateDateQuery,
  handleValidation 
} = require('../middleware/securityMiddleware');

router.get('/', protegerRota, validateDateQuery, handleValidation, entradaController.listarEntradas);
router.get('/totais', protegerRota, validateDateQuery, handleValidation, entradaController.totaisEntradas);
router.post('/', protegerRota, validateEntrada, handleValidation, entradaController.criarEntrada);
router.get('/:id', protegerRota, validateMongoId, handleValidation, entradaController.obterEntrada);
router.put('/:id', protegerRota, validateMongoId, handleValidation, entradaController.atualizarEntrada);
router.delete('/:id', protegerRota, validateMongoId, handleValidation, entradaController.deleteEntrada);

module.exports = router;
