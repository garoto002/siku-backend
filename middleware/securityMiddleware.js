/**
 * Middleware de segurança para SIKU
 * Rate limiting, validação e sanitização
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');

// ============================================
// RATE LIMITERS
// ============================================

/**
 * Rate limiter geral - 100 requests por 15 minutos
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para autenticação - 5 tentativas por 15 minutos
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta logins bem sucedidos
});

/**
 * Rate limiter para API de IA - 10 requests por hora
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: {
    success: false,
    message: 'Limite de consultas de IA atingido. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// VALIDADORES
// ============================================

/**
 * Validação para criação de gasto
 */
const validateGasto = [
  body('area')
    .notEmpty().withMessage('Área é obrigatória')
    .isMongoId().withMessage('Área inválida'),
  body('categoria')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isMongoId().withMessage('Categoria inválida'),
  body('valor')
    .notEmpty().withMessage('Valor é obrigatório')
    .isNumeric().withMessage('Valor deve ser numérico')
    .custom(val => val > 0).withMessage('Valor deve ser positivo'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Descrição muito longa (máx 500 caracteres)'),
  body('data')
    .optional()
    .isISO8601().withMessage('Data inválida'),
];

/**
 * Validação para criação de entrada
 */
const validateEntrada = [
  body('area')
    .notEmpty().withMessage('Área é obrigatória')
    .isMongoId().withMessage('Área inválida'),
  body('categoria')
    .notEmpty().withMessage('Categoria é obrigatória')
    .isMongoId().withMessage('Categoria inválida'),
  body('valor')
    .notEmpty().withMessage('Valor é obrigatório')
    .isNumeric().withMessage('Valor deve ser numérico')
    .custom(val => val > 0).withMessage('Valor deve ser positivo'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Descrição muito longa (máx 500 caracteres)'),
  body('data')
    .optional()
    .isISO8601().withMessage('Data inválida'),
];

/**
 * Validação para criação de área
 */
const validateArea = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('cor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Cor deve estar em formato hexadecimal (#RRGGBB)'),
];

/**
 * Validação para criação de categoria
 */
const validateCategoria = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('area')
    .notEmpty().withMessage('Área é obrigatória')
    .isMongoId().withMessage('Área inválida'),
];

/**
 * Validação para login
 */
const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
];

/**
 * Validação para registro
 */
const validateRegister = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
];

/**
 * Validação de parâmetro ID MongoDB
 */
const validateMongoId = [
  param('id')
    .isMongoId().withMessage('ID inválido'),
];

/**
 * Validação de query de datas
 */
const validateDateQuery = [
  query('dataInicio')
    .optional()
    .isISO8601().withMessage('Data de início inválida'),
  query('dataFim')
    .optional()
    .isISO8601().withMessage('Data de fim inválida'),
];

// ============================================
// MIDDLEWARE DE VALIDAÇÃO
// ============================================

/**
 * Middleware para verificar erros de validação
 */
const handleValidation = (req, res, next) => {
  console.log('🔍 VALIDAÇÃO - Body recebido:', JSON.stringify(req.body, null, 2));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ ERROS DE VALIDAÇÃO:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  console.log('✅ Validação passou');
  next();
};

// ============================================
// CONFIGURAÇÃO CORS
// ============================================

/**
 * Opções de CORS seguras
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'exp://localhost:8081',
      // Adicionar domínio de produção aqui
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas
};

// ============================================
// HELMET CONFIG
// ============================================

/**
 * Configuração do Helmet para headers de segurança
 */
const helmetConfig = helmet({
  contentSecurityPolicy: false, // Desabilita CSP para APIs
  crossOriginEmbedderPolicy: false,
});

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  aiLimiter,
  
  // Validadores
  validateGasto,
  validateEntrada,
  validateArea,
  validateCategoria,
  validateLogin,
  validateRegister,
  validateMongoId,
  validateDateQuery,
  
  // Middleware
  handleValidation,
  
  // CORS & Helmet
  corsOptions,
  helmetConfig,
};
