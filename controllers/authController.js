const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { criarDadosIniciais } = require('../utils/seedData');

const gerarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Registrar usuário
const registrarUsuario = async (req, res) => {
  try {
    const { username: nome, email, password: senha } = req.body;

    // Verificar se usuário já existe
    const usuarioExiste = await User.findOne({ email });
    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email'
      });
    }

    // Criar usuário
    const usuario = new User({
      nome,
      email,
      senha
    });
    await usuario.save();

    // Criar dados iniciais (áreas e categorias padrão)
    const dadosIniciais = await criarDadosIniciais(usuario._id);
    if (!dadosIniciais.success) {
      console.warn('⚠️ Aviso: Dados iniciais não foram criados:', dadosIniciais.message);
    }

    // Gerar token
    const token = gerarToken(usuario._id);

    res.status(201).json({
      success: true,
      message: 'Usuário registado com sucesso! Bem-vindo ao Siku!',
      data: {
        usuario,
        token,
        dadosIniciais: dadosIniciais.success ? dadosIniciais.data : null
      }
    });

  } catch (error) {
    console.error('❌ Erro no registro:', error);
    
    // Tratamento de erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: messages
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

  // Login de usuário
  const loginUsuario = async (req, res) => {
      // Log detalhado do body recebido para debug
      console.log('🔍 [LOGIN] Body recebido:', JSON.stringify(req.body));
    try {
      const { email, password: senha } = req.body;

      // Verificar se usuário existe
      const usuario = await User.findOne({ email }).select('+senha');
      if (!usuario) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar senha
      const senhaCorreta = await usuario.verificarSenha(senha);
      if (!senhaCorreta) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta'
        });
      }

      // Gerar token
      const token = gerarToken(usuario._id);

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso!',
        data: {
          usuario: usuario.toJSON(),
          token
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao fazer login',
        error: error.message
      });
    }
  };


// Atualizar perfil do usuário autenticado
const atualizarPerfil = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id).select('+senha');
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const { nome, email, senhaAtual, novaSenha } = req.body;
    if (nome) usuario.nome = nome;
    if (email) usuario.email = email;
    if (novaSenha) {
      // Verifica senha atual antes de trocar
      if (!senhaAtual) {
        return res.status(400).json({ success: false, message: 'Informe a senha atual para alterar.' });
      }
      const senhaCorreta = await usuario.verificarSenha(senhaAtual);
      if (!senhaCorreta) {
        return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
      }
      usuario.senha = novaSenha;
    }
    await usuario.save();
    return res.status(200).json({ success: true, usuario: usuario.toJSON(), message: 'Perfil atualizado com sucesso!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar perfil', error: error.message });
  }
};

  // Teste de conexão
  const testeConexao = (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'API de autenticação funcionando!'
    });
  };

  module.exports = {
    registrarUsuario,
    loginUsuario,
    testeConexao,
    atualizarPerfil
  };
