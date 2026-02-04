const express = require('express');
const router = express.Router();
const { listarAlerts, marcarComoLido, removerAlert, detectAlerts, registerPushToken, getAlertSettings, updateAlertSettings } = require('../controllers/alertController');
const { protegerRota } = require('../middleware/authMiddleware');

router.use(protegerRota);

router.get('/', listarAlerts);
router.put('/:id/read', marcarComoLido);
router.delete('/:id', removerAlert);
// Endpoint para disparar detecção manual (útil para debug e para chamar via cron)
router.post('/run', detectAlerts);
router.post('/register', registerPushToken);
router.get('/settings', getAlertSettings);
router.put('/settings', updateAlertSettings);

module.exports = router;