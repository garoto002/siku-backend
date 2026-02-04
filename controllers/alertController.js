const Gasto = require('../models/Gasto');
const Alert = require('../models/Alert');
const User = require('../models/User');
const mongoose = require('mongoose');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

// Listar alerts do usuário
const listarAlerts = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const { limit = 50, skip = 0 } = req.query;
    const alerts = await Alert.find({ usuario: usuarioId }).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit));
    const count = await Alert.countDocuments({ usuario: usuarioId });
    res.json({ success: true, data: alerts, count });
  } catch (error) {
    console.error('Erro ao listar alerts:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar alerts' });
  }
};

// Marcar como lido
const marcarComoLido = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const alertId = req.params.id;
    const alert = await Alert.findOneAndUpdate({ _id: alertId, usuario: usuarioId }, { read: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert não encontrado' });
    return res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Erro ao marcar alert como lido:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar alert' });
  }
};

// Remover alert
const removerAlert = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const alertId = req.params.id;
    const alert = await Alert.findOneAndDelete({ _id: alertId, usuario: usuarioId });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert não encontrado' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover alert:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover alert' });
  }
};

// Detectar aumentos de gastos e criar alerts (execução por usuário) - legacy
const detectAlerts_legacy = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    // Parâmetros: periodDays (ex: 30), increaseThreshold (percent) e absoluteMin
    const periodDays = Number(req.body.periodDays || 30);
    const increaseThreshold = Number(req.body.increaseThreshold || 30); // percent
    const absoluteMin = Number(req.body.absoluteMin || 100); // currency

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - periodDays);

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);

    // Agregar gastos por categoria no período atual
    const current = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(usuarioId), data: { $gte: start, $lte: now } } },
      { $group: { _id: '$categoria', total: { $sum: '$valor' } } }
    ]);

    const previous = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(usuarioId), data: { $gte: prevStart, $lt: start } } },
      { $group: { _id: '$categoria', total: { $sum: '$valor' } } }
    ]);

    const prevMap = {};
    previous.forEach(p => { prevMap[p._id?.toString()] = p.total; });

    // Use helper to create alert and optionally push
    const created = [];
    const createAndNotify = async (userId, tipo, title, message, meta) => {
      const a = await Alert.create({ usuario: userId, tipo, title, message, meta });
      created.push(a);

      // try sending push
      try {
        const user = await User.findById(userId);
        if (user && user.expoPushToken && user.alertsSettings && user.alertsSettings.types && user.alertsSettings.types[tipo]) {
          const pushToken = user.expoPushToken;
          if (Expo.isExpoPushToken(pushToken)) {
            const msg = {
              to: pushToken,
              sound: 'default',
              title,
              body: message,
              data: { alertId: a._id }
            };
            const ticketChunk = await expo.sendPushNotificationsAsync([msg]);
            // ignoring tickets for now; production should handle receipts
          }
        }
      } catch (err) {
        console.error('Erro ao enviar push:', err);
      }

      return a;
    };

    for (const c of current) {
      const prev = prevMap[c._id?.toString()] || 0;
      const delta = c.total - prev;
      const percent = prev > 0 ? (delta / prev) * 100 : 100;
      if (delta > absoluteMin && percent >= increaseThreshold) {
        const title = 'Aumento de gastos detectado';
        const message = `Na categoria ${c._id || 'Sem categoria'} houve aumento de ${Math.round(percent)}% (∆ ${c.total - prev} ) nos últimos ${periodDays} dias.`;
        await createAndNotify(usuarioId, 'spending_increase', title, message, { categoria: c._id, current: c.total, previous: prev, percent: Math.round(percent) });
      }
    }

    // Grandes transações recentes (últimos periodDays)
    const avgAll = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(usuarioId) } },
      { $group: { _id: null, avg: { $avg: '$valor' } } }
    ]);
    const avg = (avgAll[0] && avgAll[0].avg) || 0;
    const threshold = Math.max(avg * 2, 500); // > 2x média ou 500
    const large = await Gasto.find({ usuario: usuarioId, data: { $gte: start, $lte: now }, valor: { $gte: threshold } }).limit(50);
    for (const g of large) {
      const title = 'Gasto alto detectado';
      const message = `Gasto de MZN ${g.valor} em ${g.titulo || g.descricao || 'sem descrição'} na data ${new Date(g.data).toLocaleDateString()}.`;
      await createAndNotify(usuarioId, 'large_transaction', title, message, { gastoId: g._id, valor: g.valor });
    }

    res.json({ success: true, createdCount: created.length, created });
  } catch (error) {
    console.error('Erro ao detectar alerts:', error);
    res.status(500).json({ success: false, message: 'Erro ao detectar alerts' });
  }
};

// Registrar push token
const registerPushToken = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token é obrigatório' });
    const user = await User.findByIdAndUpdate(usuarioId, { expoPushToken: token }, { new: true });
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Erro ao registrar push token:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar token' });
  }
};

// Obter / atualizar configurações de alertas do usuário
const getAlertSettings = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const user = await User.findById(usuarioId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    return res.json({ success: true, data: user.alertsSettings || {} });
  } catch (error) {
    console.error('Erro ao buscar settings:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar settings' });
  }
};

const updateAlertSettings = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const updates = req.body;
    const user = await User.findById(usuarioId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    user.alertsSettings = { ...(user.alertsSettings || {}), ...updates };
    await user.save();
    return res.json({ success: true, data: user.alertsSettings });
  } catch (error) {
    console.error('Erro ao atualizar settings:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar settings' });
  }
};

// Função reutilizável para detecção para um usuário (usada pelo cron)
const detectAlertsForUser = async (userId, opts = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'Usuário não encontrado' };
    const settings = user.alertsSettings || {};
    if (settings.enabled === false) return { success: true, createdCount: 0 };

    const periodDays = Number(opts.periodDays ?? settings.periodDays ?? 30);
    const increaseThreshold = Number(opts.increaseThreshold ?? settings.increaseThreshold ?? 30);
    const absoluteMin = Number(opts.absoluteMin ?? settings.absoluteMin ?? 100);

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - periodDays);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);

    const current = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: start, $lte: now } } },
      { $group: { _id: '$categoria', total: { $sum: '$valor' } } }
    ]);

    const previous = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: prevStart, $lt: start } } },
      { $group: { _id: '$categoria', total: { $sum: '$valor' } } }
    ]);

    const prevMap = {};
    previous.forEach(p => { prevMap[p._id?.toString()] = p.total; });

    const created = [];

    const createAndNotify = async (userId, tipo, title, message, meta) => {
      const a = await Alert.create({ usuario: userId, tipo, title, message, meta });
      created.push(a);
      try {
        const user = await User.findById(userId);
        if (user && user.expoPushToken && user.alertsSettings && user.alertsSettings.types && user.alertsSettings.types[tipo]) {
          const pushToken = user.expoPushToken;
          if (Expo.isExpoPushToken(pushToken)) {
            const msg = {
              to: pushToken,
              sound: 'default',
              title,
              body: message,
              data: { alertId: a._id }
            };
            await expo.sendPushNotificationsAsync([msg]);
          }
        }
      } catch (err) { console.error('Erro ao enviar push:', err); }
      return a;
    };

    for (const c of current) {
      const prev = prevMap[c._id?.toString()] || 0;
      const delta = c.total - prev;
      const percent = prev > 0 ? (delta / prev) * 100 : 100;
      if (delta > absoluteMin && percent >= increaseThreshold) {
        const title = 'Aumento de gastos detectado';
        const message = `Na categoria ${c._id || 'Sem categoria'} houve aumento de ${Math.round(percent)}% (∆ ${c.total - prev} ) nos últimos ${periodDays} dias.`;
        await createAndNotify(userId, 'spending_increase', title, message, { categoria: c._id, current: c.total, previous: prev, percent: Math.round(percent) });
      }
    }

    // Grandes transações
    const avgAll = await Gasto.aggregate([
      { $match: { usuario: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, avg: { $avg: '$valor' } } }
    ]);
    const avg = (avgAll[0] && avgAll[0].avg) || 0;
    const threshold = Math.max(avg * 2, 500);
    const large = await Gasto.find({ usuario: userId, data: { $gte: start, $lte: now }, valor: { $gte: threshold } }).limit(50);
    for (const g of large) {
      const title = 'Gasto alto detectado';
      const message = `Gasto de MZN ${g.valor} em ${g.titulo || g.descricao || 'sem descrição'} na data ${new Date(g.data).toLocaleDateString()}.`;
      await createAndNotify(userId, 'large_transaction', title, message, { gastoId: g._id, valor: g.valor });
    }

    // Despesas recorrentes (simples): categorias que aparecem todos os meses nos últimos 3 meses
    try {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recurring = await Gasto.aggregate([
        { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: threeMonthsAgo, $lte: now } } },
        { $group: { _id: { categoria: '$categoria', month: { $dateToString: { format: '%Y-%m', date: '$data' } } }, total: { $sum: '$valor' } } },
        { $group: { _id: '$_id.categoria', monthsCount: { $sum: 1 }, avg: { $avg: '$total' } } },
        { $match: { monthsCount: { $gte: 3 }, avg: { $gte: absoluteMin } } }
      ]);
      for (const r of recurring) {
        const title = 'Despesa recorrente detectada';
        const message = `Categoria ${r._id} tem gasto médio mensal de MZN ${Math.round(r.avg)} nos últimos 3 meses.`;
        await createAndNotify(userId, 'recurring_expense', title, message, { categoria: r._id, avg: Math.round(r.avg) });
      }
    } catch (e) { console.error('Erro ao detectar recorrentes:', e); }

    // Lembretes de metas simples: metas que começam nos próximos 7 dias
    try {
      const Meta = require('../models/Meta');
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);
      const metas = await Meta.find({ usuario: userId, status: { $ne: 'concluida' }, dataInicio: { $lte: in7.toISOString().split('T')[0] } });
      for (const m of metas) {
        const title = 'Lembrete de meta';
        const message = `Meta "${m.titulo}" inicia em ${m.dataInicio}. Lembre-se de planejar e executar.`;
        await createAndNotify(userId, 'goal_reminder', title, message, { metaId: m._id });
      }
    } catch (e) { console.error('Erro ao detectar metas:', e); }

    // Anomalias (simples): transações que estão 3x acima da média do período
    try {
      const vals = await Gasto.aggregate([
        { $match: { usuario: new mongoose.Types.ObjectId(userId), data: { $gte: start, $lte: now } } },
        { $group: { _id: null, avg: { $avg: '$valor' }, std: { $stdDevPop: '$valor' } } }
      ]);
      const avgVal = vals[0]?.avg || 0;
      const std = vals[0]?.std || 0;
      const anomalyThreshold = avgVal + (std * 3);
      const anomalies = await Gasto.find({ usuario: userId, data: { $gte: start, $lte: now }, valor: { $gte: anomalyThreshold } }).limit(50);
      for (const a of anomalies) {
        const title = 'Anomalia detectada';
        const message = `Transação atípica de MZN ${a.valor} em ${a.titulo || a.descricao || 'sem descrição'} (média ${Math.round(avgVal)})`;
        await createAndNotify(userId, 'anomalies', title, message, { gastoId: a._id, valor: a.valor, avg: Math.round(avgVal) });
      }
    } catch (e) { console.error('Erro ao detectar anomalias:', e); }

    return { success: true, createdCount: created.length, created };
  } catch (error) {
    console.error('Erro em detectAlertsForUser:', error);
    return { success: false, message: 'Erro interno' };
  }
};

// Atualizar detectAlerts para usar a função acima para o usuário autenticado
const detectAlerts = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id || (req.usuario?._id && req.usuario._id.toString());
    const r = await detectAlertsForUser(usuarioId, req.body || {});
    return res.json(r);
  } catch (error) {
    console.error('Erro ao detectar alerts:', error);
    res.status(500).json({ success: false, message: 'Erro ao detectar alerts' });
  }
};

module.exports = {
  listarAlerts,
  marcarComoLido,
  removerAlert,
  detectAlerts,
  detectAlertsForUser,
  registerPushToken,
  getAlertSettings,
  updateAlertSettings
};