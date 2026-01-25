const express = require('express');
const {
  criarAtividade,
  listarAtividades,
  buscarAtividade,
  atualizarAtividade,
  excluirAtividade,
  obterEstatisticas
} = require('../controllers/atividadeController');
const { protegerRota } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(protegerRota);

// Rotas CRUD para atividades
router.post('/', criarAtividade);
router.get('/', listarAtividades);
router.get('/stats', obterEstatisticas);
router.get('/:id', buscarAtividade);
router.put('/:id', atualizarAtividade);
router.delete('/:id', excluirAtividade);

module.exports = router;