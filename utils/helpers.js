/**
 * Helpers utilitários para o backend SIKU
 */

/**
 * Extrai o ID do usuário do objeto req.usuario de forma consistente
 * @param {Object} req - Express request object
 * @returns {string|null} - User ID ou null se não autenticado
 */
const getUserId = (req) => {
  if (!req.usuario) return null;
  return req.usuario.id || (req.usuario._id && req.usuario._id.toString()) || null;
};

/**
 * Verifica se usuário está autenticado e retorna erro se não
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string|null} - User ID ou null (já enviou resposta de erro)
 */
const requireAuth = (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    return null;
  }
  return userId;
};

/**
 * Campos permitidos para criação/atualização de cada modelo
 */
const allowedFields = {
  gasto: ['titulo', 'descricao', 'data', 'hora', 'prioridade', 'status', 'area', 'categoria', 'valor'],
  entrada: ['titulo', 'descricao', 'data', 'status', 'area', 'categoria', 'valor'],
  atividade: ['titulo', 'descricao', 'data', 'hora', 'duracao', 'prioridade', 'status', 'area', 'categoria', 'projeto'],
  meta: ['titulo', 'descricao', 'dataInicio', 'dataFim', 'status', 'progresso', 'tipo', 'valorAlvo', 'valorAtual'],
  projeto: ['nome', 'descricao', 'dataInicio', 'dataFim', 'status', 'cor'],
  area: ['nome', 'cor', 'icone'],
  categoria: ['nome', 'cor', 'area'],
  // habito foi removido - agora tudo é gasto
  habito: ['titulo', 'descricao', 'data', 'hora', 'prioridade', 'status', 'area', 'categoria', 'valor'] // Igual a gasto
};

/**
 * Filtra campos do body para permitir apenas os campos autorizados
 * @param {Object} body - req.body
 * @param {string} model - Nome do modelo (gasto, entrada, etc.)
 * @returns {Object} - Objeto filtrado com apenas campos permitidos
 */
const filterFields = (body, model) => {
  const allowed = allowedFields[model];
  if (!allowed) return body;
  
  const filtered = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      filtered[field] = body[field];
    }
  }
  return filtered;
};

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} str - String para sanitizar
 * @returns {string} - String sanitizada
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Formata valor monetário
 * @param {number} valor - Valor numérico
 * @param {string} moeda - Código da moeda (default: MZN)
 * @returns {string} - Valor formatado
 */
const formatCurrency = (valor, moeda = 'MZN') => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: moeda
  }).format(valor);
};

/**
 * Verifica se é ambiente de produção
 * @returns {boolean}
 */
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Logger condicional - só loga em desenvolvimento
 * @param  {...any} args - Argumentos para console.log
 */
const devLog = (...args) => {
  if (!isProduction()) {
    console.log(...args);
  }
};

module.exports = {
  getUserId,
  requireAuth,
  filterFields,
  allowedFields,
  sanitizeString,
  formatCurrency,
  isProduction,
  devLog
};
