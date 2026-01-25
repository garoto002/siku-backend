const express = require('express');
const { 
  registrarUsuario, 
  loginUsuario, 
  obterPerfil,
  testeConexao 
} = require('../controllers/authController');
const { protegerRota } = require('../middleware/authMiddleware');

const router = express.Router();

// Rota de teste de conexão
router.get('/test', testeConexao);

// Rotas públicas
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);

// Rotas protegidas
router.get('/perfil', protegerRota, obterPerfil);

module.exports = router;