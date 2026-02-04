const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const { validateDateQuery, handleValidation } = require('../middleware/securityMiddleware');
const relatorioController = require('../controllers/relatorioController');

// Todas as rotas requerem autenticação
router.use(protegerRota);

// Exportar CSV
router.get('/csv', validateDateQuery, handleValidation, relatorioController.exportarCSV);

// Relatório completo (JSON para PDF no frontend)
router.get('/completo', validateDateQuery, handleValidation, relatorioController.exportarRelatorio);

// Resumo financeiro mensal
router.get('/resumo', relatorioController.resumoFinanceiro);

module.exports = router;
