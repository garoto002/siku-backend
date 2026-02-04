const cron = require('node-cron');
const User = require('../models/User');
const { detectAlertsForUser } = require('../controllers/alertController');

// Schedule: daily at 02:00
const scheduleDaily = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🔔 [Scheduler] Executando detecção diária de alertas');
    try {
      const users = await User.find({ 'alertsSettings.enabled': { $ne: false } }).select('_id');
      for (const u of users) {
        try {
          await detectAlertsForUser(u._id);
        } catch (e) { console.error('Erro ao detectar para usuário', u._id, e); }
      }
    } catch (e) { console.error('Erro ao buscar usuários para scheduler', e); }
  }, { timezone: 'UTC' });
};

// Schedule: weekly on Monday at 03:00
const scheduleWeekly = () => {
  cron.schedule('0 3 * * 1', async () => {
    console.log('🔔 [Scheduler] Executando detecção semanal de alertas');
    try {
      const users = await User.find({ 'alertsSettings.enabled': { $ne: false } }).select('_id');
      for (const u of users) {
        try {
          await detectAlertsForUser(u._id, { periodDays: 7 });
        } catch (e) { console.error('Erro ao detectar para usuário', u._id, e); }
      }
    } catch (e) { console.error('Erro ao buscar usuários para scheduler', e); }
  }, { timezone: 'UTC' });
};

module.exports = { scheduleDaily, scheduleWeekly };