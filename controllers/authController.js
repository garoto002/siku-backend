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

// Solicitar recuperação de senha
const solicitarRecuperacaoSenha = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Verificar se usuário existe
    const usuario = await User.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      // Por segurança, não revelar se o email existe ou não
      return res.status(200).json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Gerar código de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Salvar código hasheado e expiração (15 minutos)
    const crypto = require('crypto');
    const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    
    usuario.resetPasswordToken = hashedCode;
    usuario.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await usuario.save();

    // Enviar email com o código
    const nodemailer = require('nodemailer');
    
    // Configurar transporter (usar variáveis de ambiente)
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"SIKU App" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: 'Recuperação de Senha - SIKU',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">SIKU</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Recuperação de Senha</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #374151; font-size: 16px;">Olá <strong>${usuario.nome}</strong>,</p>
            <p style="color: #6b7280; font-size: 14px;">Você solicitou a recuperação da sua senha. Use o código abaixo para criar uma nova senha:</p>
            <div style="background: #10B981; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
              ${resetCode}
            </div>
            <p style="color: #6b7280; font-size: 14px;">Este código expira em <strong>15 minutos</strong>.</p>
            <p style="color: #ef4444; font-size: 12px;">Se você não solicitou esta recuperação, ignore este email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">SIKU - O progresso acontece um dia de cada vez</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de recuperação enviado para: ${usuario.email}`);

    return res.status(200).json({
      success: true,
      message: 'Código de recuperação enviado para o seu email.'
    });

  } catch (error) {
    console.error('❌ Erro ao solicitar recuperação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação. Tente novamente.',
      error: error.message
    });
  }
};

// Verificar código de recuperação
const verificarCodigoRecuperacao = async (req, res) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Email e código são obrigatórios'
      });
    }

    const crypto = require('crypto');
    const hashedCode = crypto.createHash('sha256').update(codigo).digest('hex');

    const usuario = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido ou expirado'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Código válido'
    });

  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar código',
      error: error.message
    });
  }
};

// Redefinir senha
const redefinirSenha = async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'Email, código e nova senha são obrigatórios'
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    const crypto = require('crypto');
    const hashedCode = crypto.createHash('sha256').update(codigo).digest('hex');

    const usuario = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido ou expirado. Solicite um novo código.'
      });
    }

    // Atualizar senha
    usuario.senha = novaSenha;
    usuario.resetPasswordToken = null;
    usuario.resetPasswordExpires = null;
    await usuario.save();

    console.log(`✅ Senha redefinida com sucesso para: ${usuario.email}`);

    return res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.'
    });

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha',
      error: error.message
    });
  }
};

  module.exports = {
    registrarUsuario,
    loginUsuario,
    testeConexao,
    atualizarPerfil,
    solicitarRecuperacaoSenha,
    verificarCodigoRecuperacao,
    redefinirSenha
  };
