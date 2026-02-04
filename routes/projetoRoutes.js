const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const projetoController = require('../controllers/projetoController');

router.get('/', protegerRota, projetoController.listarProjetos);
router.get('/:id', protegerRota, projetoController.obterProjeto);
router.post('/', protegerRota, projetoController.criarProjeto);
router.put('/:id', protegerRota, projetoController.atualizarProjeto);
router.delete('/:id', protegerRota, projetoController.excluirProjeto);
router.patch('/:id/cumprido', protegerRota, projetoController.marcarCumprido);

module.exports = router;
