const { createBot } = require('./createBot');
const accounts = require('./accounts');
const { logEvent } = require('../db');

// Runs the shared system bot plus one bot per user who brought their own token. The dashboard
// asks clientForUser() which client a given logged-in user should act through.
let systemBot = null;
const userBots = new Map(); // userId -> { client, distube, status }

function friendlyLoginError(message) {
  const m = String(message || '');
  if (/token/i.test(m) && /invalid|provided/i.test(m)) return 'โทเคนบอทไม่ถูกต้อง';
  if (/disallowed intents/i.test(m)) return 'บอทยังไม่ได้เปิด intents ที่จำเป็น (เปิด Server Members ไม่ต้อง แต่ต้องเป็นบอทที่ใช้ได้)';
  return m.slice(0, 120) || 'เชื่อมต่อบอทไม่สำเร็จ';
}

/** Connect (or reconnect) the shared system bot. Safe to call with a missing token. */
function initSystemBot(token) {
  if (!token) {
    console.warn('DISCORD_TOKEN not set — the shared system bot will not run.');
    return null;
  }
  systemBot = createBot();
  systemBot.client.login(token).catch((e) => console.error('System bot login failed:', e.message));
  return systemBot;
}

const getSystemClient = () => (systemBot ? systemBot.client : null);

/** Bring a user's own bot online. Returns { ok } or { ok:false, error }. Idempotent. */
async function connectUserBot(userId, token) {
  disconnectUserBot(userId);
  if (!token) return { ok: false, error: 'ไม่มีโทเคน' };
  const bot = createBot();
  try {
    await bot.client.login(token);
    userBots.set(userId, { client: bot.client, distube: bot.distube, status: 'connected' });
    logEvent({ type: 'own_bot_online', detail: `user ${userId} · ${bot.client.user?.tag || '?'}` });
    return { ok: true, username: bot.client.user?.username || null };
  } catch (e) {
    try {
      bot.client.destroy();
    } catch {
      // client may not have opened a connection yet
    }
    return { ok: false, error: friendlyLoginError(e.message) };
  }
}

function disconnectUserBot(userId) {
  const b = userBots.get(userId);
  if (!b) return false;
  try {
    b.client.destroy();
  } catch {
    // already gone
  }
  userBots.delete(userId);
  return true;
}

const isUserBotOnline = (userId) => userBots.has(userId);

/** The client a logged-in user should act through: their own bot if online, else the system bot. */
function clientForUser(user) {
  if (user && user.bot_mode === 'own') {
    const b = userBots.get(user.id);
    if (b) return b.client;
  }
  return getSystemClient();
}

/** On startup, bring every stored own-bot online and record the outcome on the account. */
async function bootOwnBots() {
  for (const u of accounts.listOwnBotUsers()) {
    const r = await connectUserBot(u.id, u.token);
    accounts.updateOwnBotStatus(u.id, r.ok ? 'connected' : r.error || 'error');
  }
}

module.exports = {
  initSystemBot,
  getSystemClient,
  connectUserBot,
  disconnectUserBot,
  isUserBotOnline,
  clientForUser,
  bootOwnBots,
};
