const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { ChannelType } = require('discord.js');
const { getGuildSettings, saveGuildSettings } = require('../db');
const { loginPage, guildListPage, guildSettingsPage } = require('./views');

const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function isLockedOut(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: Date.now() + LOCKOUT_MS };
  entry.count += 1;
  loginAttempts.set(ip, entry);
}

function passwordMatches(input, expected) {
  const a = Buffer.from(String(input));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function startDashboard(client) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    console.warn('DASHBOARD_PASSWORD is not set — skipping dashboard startup (set it in your .env / Railway variables to enable the web dashboard).');
    return;
  }

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 12 * 60 * 60 * 1000,
      },
    }),
  );

  function requireAuth(req, res, next) {
    if (req.session.loggedIn) return next();
    return res.redirect('/login');
  }

  app.get('/login', (req, res) => {
    res.send(loginPage());
  });

  app.post('/login', (req, res) => {
    const ip = req.ip;
    if (isLockedOut(ip)) {
      return res.status(429).send(loginPage({ error: 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' }));
    }
    if (passwordMatches(req.body.password || '', password)) {
      loginAttempts.delete(ip);
      req.session.loggedIn = true;
      return res.redirect('/');
    }
    recordFailedAttempt(ip);
    return res.status(401).send(loginPage({ error: 'รหัสผ่านไม่ถูกต้อง' }));
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  app.get('/', requireAuth, (req, res) => {
    const guilds = [...client.guilds.cache.values()].map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
    }));
    res.send(guildListPage({ guilds }));
  });

  app.get('/guild/:id', requireAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');

    const textChannels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: c.name }));
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name }));

    const settings = getGuildSettings(guild.id);
    res.send(
      guildSettingsPage({
        guild: { id: guild.id, name: guild.name },
        settings,
        textChannels,
        roles,
        allCommands: [...client.commands.keys()],
        saved: req.query.saved === '1',
      }),
    );
  });

  app.post('/guild/:id', requireAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');

    const allCommands = [...client.commands.keys()];
    const enabled = [].concat(req.body.enabled_commands || []);
    const disabled_commands = allCommands.filter((name) => !enabled.includes(name));

    const volume = Math.min(100, Math.max(0, parseInt(req.body.default_volume, 10) || 0));

    saveGuildSettings(guild.id, {
      default_volume: volume,
      announce_channel_id: req.body.announce_channel_id || null,
      dj_role_id: req.body.dj_role_id || null,
      disabled_commands,
    });

    res.redirect(`/guild/${guild.id}?saved=1`);
  });

  app.get('/guild/:id/status.json', requireAuth, (req, res) => {
    const queue = client.distube.getQueue(req.params.id);
    if (!queue) return res.json({ playing: false });
    res.json({
      playing: true,
      nowPlaying: queue.songs[0]?.name || '',
      voiceChannel: queue.voice.channel?.name || '',
      queue: queue.songs.map((s) => s.name),
    });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard listening on port ${port}`);
  });
}

module.exports = startDashboard;
