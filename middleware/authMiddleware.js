const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protegerRota = async (req, res, next) => {
  try {
    console.log('🔐 Verificando autenticação...');
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 Token encontrado no header');
    }
    if (!token) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({
        success: false,
        message: 'Acesso negado. Token não fornecido.'
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado:', decoded);
    const usuario = await User.findById(decoded.id);
    if (!usuario) {
      console.log('❌ Usuário não encontrado para ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou usuário não encontrado'
      });
    }
    console.log('👤 Usuário autenticado:', usuario.nome);
    req.usuario = usuario;
    next();
  } catch (error) {
    console.log('❌ Erro na autenticação:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

module.exports = { protegerRota };