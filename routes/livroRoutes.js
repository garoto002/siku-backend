const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const livroController = require('../controllers/livroController');
const { 
  validateMongoId,
  handleValidation 
} = require('../middleware/securityMiddleware');

// Rotas principais
router.get('/', protegerRota, livroController.listarLivros);
router.post('/', protegerRota, livroController.criarLivro);

// Estatísticas (deve estar antes de rotas com :id)
router.get('/estatisticas', protegerRota, livroController.estatisticas);

// Rotas com ID
router.get('/:id', protegerRota, validateMongoId, handleValidation, livroController.obterLivro);
router.put('/:id', protegerRota, validateMongoId, handleValidation, livroController.atualizarLivro);
router.delete('/:id', protegerRota, validateMongoId, handleValidation, livroController.excluirLivro);

// Atualizar progresso de leitura
router.patch('/:id/progresso', protegerRota, validateMongoId, handleValidation, livroController.atualizarProgresso);

// Rotas de resumos diários
router.post('/:id/resumos', protegerRota, validateMongoId, handleValidation, livroController.adicionarResumo);
router.put('/:id/resumos/:resumoId', protegerRota, validateMongoId, handleValidation, livroController.atualizarResumo);
router.delete('/:id/resumos/:resumoId', protegerRota, validateMongoId, handleValidation, livroController.excluirResumo);

module.exports = router;
