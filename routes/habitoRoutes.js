const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const habitoController = require('../controllers/habitoController');

router.get('/', protegerRota, habitoController.listarHabitos);
router.post('/', protegerRota, habitoController.criarHabito);
router.get('/:id', protegerRota, habitoController.obterHabito);
router.put('/:id', protegerRota, habitoController.atualizarHabito);
router.delete('/:id', protegerRota, habitoController.excluirHabito);

// Rota de teste pública para depuração (não exige autenticação)
router.post('/test', (req, res) => {
  console.log('📥 [HabitoTest] Payload recebido:', req.body);
  res.json({ success: true, test: true, body: req.body });
});

module.exports = router;
