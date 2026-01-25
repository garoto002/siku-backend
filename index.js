const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao banco de dados
connectDB();
console.log('✅ Banco conectado');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Log global para todas as requisições
app.use((req, res, next) => {
  console.log('🌐 Nova requisição:', req.method, req.url);
  next();
});

// Rotas de autenticação
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Rotas de atividades
const atividadeRoutes = require('./routes/atividadeRoutes');
app.use('/api/atividades', atividadeRoutes);

// Rotas de hábitos
const habitoRoutes = require('./routes/habitoRoutes');
app.use('/api/habitos', habitoRoutes);

// Rotas de áreas
const areaRoutes = require('./routes/areaRoutes');
app.use('/api/areas', areaRoutes);

// Rotas de categorias
const categoriaRoutes = require('./routes/categoriaRoutes');
app.use('/api/categorias', categoriaRoutes);

// Rotas de projetos
const projetoRoutes = require('./routes/projetoRoutes');
app.use('/api/projetos', projetoRoutes);

// Rotas de metas
const metaRoutes = require('./routes/metaRoutes');
app.use('/api/metas', metaRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'SIKU Backend API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      atividades: '/api/atividades',
      habitos: '/api/habitos',
      areas: '/api/areas',
      categorias: '/api/categorias',
      projetos: '/api/projetos',
      metas: '/api/metas',
      health: '/ping'
    }
  });
});

// Health check
app.get('/ping', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'undefined' }));

// Para desenvolvimento local
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT} (bind: 0.0.0.0)`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
  });
}

// Export para Vercel (serverless)
module.exports = app;
