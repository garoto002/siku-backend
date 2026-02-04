const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const { 
  generalLimiter, 
  corsOptions, 
  helmetConfig 
} = require('./middleware/securityMiddleware');
const { isProduction, devLog } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao banco de dados
connectDB().then(() => {
  console.log('✅ Banco conectado');
}).catch(err => {
  console.error('❌ Erro ao conectar banco:', err);
});

// Middlewares de segurança
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

// Log global para requisições (apenas em desenvolvimento)
app.use((req, res, next) => {
  devLog('🌐 Nova requisição:', req.method, req.url);
  next();
});

// Rotas de autenticação
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Rotas de atividades
const atividadeRoutes = require('./routes/atividadeRoutes');
app.use('/api/atividades', atividadeRoutes);

// Rotas de hábitos (compatibilidade temporária)
const habitoRoutes = require('./routes/habitoRoutes');
app.use('/api/habitos', habitoRoutes);

// Rotas de gastos (nova nomenclatura)
const gastoRoutes = require('./routes/gastoRoutes');
app.use('/api/gastos', gastoRoutes);

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

// Rotas de entradas (receitas)
const entradaRoutes = require('./routes/entradaRoutes');
app.use('/api/entradas', entradaRoutes);

// Rotas de alerts
const alertRoutes = require('./routes/alertRoutes');
app.use('/api/alerts', alertRoutes);

// Rotas de insights (IA)
const insightsRoutes = require('./routes/insightsRoutes');
app.use('/api/insights', insightsRoutes);

// Rotas de relatórios (exportação CSV/PDF)
const relatorioRoutes = require('./routes/relatorioRoutes');
app.use('/api/relatorios', relatorioRoutes);

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
      insights: '/api/insights',
      relatorios: '/api/relatorios',
      health: '/ping',
      entradas: '/api/entradas'
    }
  });
});

// Health check
app.get('/ping', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'undefined' }));

// Para desenvolvimento local
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Servidor rodando na porta ${PORT} (bind: 0.0.0.0)`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);

    // Iniciar scheduler de alerts
    try {
      const { scheduleDaily, scheduleWeekly } = require('./services/alertScheduler');
      scheduleDaily();
      scheduleWeekly();
      console.log('🔔 Scheduler de alerts iniciado');
    } catch (e) { console.error('Erro ao iniciar scheduler de alerts', e); }
  });
}

// Export para Vercel (serverless)
module.exports = app;
