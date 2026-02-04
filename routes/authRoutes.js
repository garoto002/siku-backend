const express = require('express');
const { 
  registrarUsuario, 
  loginUsuario, 
  testeConexao 
} = require('../controllers/authController');
const { protegerRota } = require('../middleware/authMiddleware');
const { 
  authLimiter, 
  validateLogin, 
  validateRegister, 
  handleValidation 
} = require('../middleware/securityMiddleware');

const router = express.Router();

// Rota de teste de conexão
router.get('/test', testeConexao);

// Rotas públicas com rate limiting e validação
router.post('/register', authLimiter, validateRegister, handleValidation, registrarUsuario);
router.post('/login', authLimiter, validateLogin, handleValidation, loginUsuario);

// Rotas protegidas
router.put('/perfil', protegerRota, require('../controllers/authController').atualizarPerfil);

module.exports = router;