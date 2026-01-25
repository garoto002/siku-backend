const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const metaController = require('../controllers/metaController');

router.get('/', protegerRota, metaController.listarMetas);
router.post('/', protegerRota, metaController.criarMeta);
router.put('/:id', protegerRota, metaController.atualizarMeta);
router.delete('/:id', protegerRota, metaController.excluirMeta);
router.patch('/:id/concluida', protegerRota, metaController.marcarConcluida);

module.exports = router;