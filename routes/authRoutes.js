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

// Rota de debug para POST
router.post('/debug', (req, res) => {
  console.log('🔍 DEBUG POST - Raw body:', req.body);
  console.log('🔍 DEBUG POST - Body type:', typeof req.body);
  console.log('🔍 DEBUG POST - Content-Type:', req.headers['content-type']);
  res.json({ 
    success: true, 
    body: req.body, 
    bodyType: typeof req.body,
    contentType: req.headers['content-type'],
    message: 'Debug POST funcionou!' 
  });
});

// Rotas públicas SEM validação para debug
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);

// Rotas protegidas
router.put('/perfil', protegerRota, require('../controllers/authController').atualizarPerfil);

module.exports = router;