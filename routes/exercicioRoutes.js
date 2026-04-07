const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const exercicioController = require('../controllers/exercicioController');

router.get('/', protegerRota, exercicioController.obterExercicio);
router.put('/metas', protegerRota, exercicioController.atualizarMetas);
router.post('/toggle', protegerRota, exercicioController.toggleDia);
router.put('/nota', protegerRota, exercicioController.atualizarNota);

module.exports = router;
