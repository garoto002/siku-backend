const express = require('express');
const router = express.Router();
const { protegerRota } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/securityMiddleware');
const {
  getInsightsFinanceiros,
  getInsightsProdutividade,
  getInsightsMetas,
  getTodosInsights,
  chatIA
} = require('../controllers/insightsController');

// Todas as rotas requerem autenticação
router.use(protegerRota);

// Insights completos (visão geral com score) - com rate limiting
router.get('/', aiLimiter, getTodosInsights);

// Insights financeiros detalhados
router.get('/financeiro', aiLimiter, getInsightsFinanceiros);

// Insights de produtividade detalhados
router.get('/produtividade', aiLimiter, getInsightsProdutividade);

// Insights de metas detalhados
router.get('/metas', aiLimiter, getInsightsMetas);

// Chat com assistente IA - rate limiting mais restrito
router.post('/chat', aiLimiter, chatIA);

module.exports = router;
