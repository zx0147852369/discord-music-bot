const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { getGuildSettings, saveGuildSettings, logEvent, getEvents } = require('../db');
const { resolveSong } = require('../lib/ytDlpPlugin');
const { getConsoleLogs } = require('../lib/consoleCapture');
const { loginPage, guildListPage, guildSettingsPage, logsPage, consoleLogsPage } = require('./views');


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
    res.send(loginPage({ bot: botInfo() }));
  });

  app.post('/login', (req, res) => {
    const ip = req.ip;
    if (isLockedOut(ip)) {
      logEvent({ level: 'warn', type: 'login_locked', actor: ip });
      return res.status(429).send(loginPage({ error: 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', bot: botInfo() }));
    }
    if (passwordMatches(req.body.password || '', password)) {
      loginAttempts.delete(ip);
      req.session.loggedIn = true;
      logEvent({ type: 'login_ok', actor: ip });
      return res.redirect('/');
    }
    recordFailedAttempt(ip);
    logEvent({ level: 'warn', type: 'login_failed', actor: ip });
    return res.status(401).send(loginPage({ error: 'รหัสผ่านไม่ถูกต้อง', bot: botInfo() }));
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  function botInfo() {
    return {
      name: client.user?.username || 'Music Bot',
      avatarUrl: client.user?.displayAvatarURL({ size: 64 }) || null,
    };
  }

  app.get('/', requireAuth, (req, res) => {
    const guilds = [...client.guilds.cache.values()]
      .map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        iconUrl: g.iconURL({ size: 128 }) || null,
        playing: client.distube.getQueue(g.id) ? true : false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.send(guildListPage({ guilds, bot: botInfo() }));
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
    const voiceChannels = guild.channels.cache
      .filter((c) => c.isVoiceBased())
      .map((c) => ({ id: c.id, name: c.name, members: c.members.filter((m) => !m.user.bot).size }));

    const settings = getGuildSettings(guild.id);
    res.send(
      guildSettingsPage({
        guild: { id: guild.id, name: guild.name, iconUrl: guild.iconURL({ size: 128 }) || null },
        settings,
        textChannels,
        roles,
        voiceChannels,
        allCommands: [...client.commands.keys()],
        saved: req.query.saved === '1',
        bot: botInfo(),
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
    logEvent({
      guildId: guild.id,
      type: 'settings_saved',
      actor: req.ip,
      detail: `เสียง ${volume}%${disabled_commands.length ? ` · ปิดคำสั่ง: ${disabled_commands.join(', ')}` : ''}`,
    });

    res.redirect(`/guild/${guild.id}?saved=1`);
  });

  app.get('/guild/:id/status.json', requireAuth, (req, res) => {
    const queue = client.distube.getQueue(req.params.id);
    if (!queue) return res.json({ playing: false });
    res.json({
      playing: true,
      paused: queue.paused,
      volume: queue.volume,
      nowPlaying: queue.songs[0]?.name || '',
      voiceChannel: queue.voice.channel?.name || '',
      voiceChannelId: queue.voice.channel?.id || '',
      queue: queue.songs.map((s) => s.name),
    });
  });

  // Queue a song straight from the dashboard. The bot joins the chosen voice channel (or the
  // one it is already in) and announces the song in the guild's configured text channel.
  app.post('/guild/:id/play', requireAuth, express.json(), async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'ไม่พบเซิร์ฟเวอร์นี้' });

    const query = String(req.body.query || '').trim();
    if (!query) return res.status(400).json({ error: 'กรุณาใส่ชื่อเพลงหรือลิงก์' });

    const existingQueue = client.distube.getQueue(guild.id);
    const channelId = req.body.channelId || existingQueue?.voice.channel?.id;
    const voiceChannel = channelId && guild.channels.cache.get(channelId);
    if (!voiceChannel?.isVoiceBased()) {
      return res.status(400).json({ error: 'กรุณาเลือกห้องเสียง' });
    }

    const me = guild.members.me;
    if (!voiceChannel.permissionsFor(me)?.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
      return res.status(403).json({ error: `บอทไม่มีสิทธิ์เข้า/พูดในห้อง ${voiceChannel.name}` });
    }

    try {
      const settings = getGuildSettings(guild.id);
      const textChannel =
        (settings.announce_channel_id && guild.channels.cache.get(settings.announce_channel_id)) ||
        guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.viewable);

      const song = await resolveSong(client.distube, query, { member: me });
      if (!song) return res.status(404).json({ error: `ไม่พบเพลง: ${query}` });

      logEvent({
        guildId: guild.id,
        type: 'dashboard_play',
        actor: req.ip,
        detail: `${song.name} → ${voiceChannel.name}`,
      });
      await client.distube.play(voiceChannel, song, { member: me, textChannel });
      res.json({ ok: true, title: song.name });
    } catch (err) {
      console.error('Dashboard play failed:', err);
      logEvent({
        guildId: guild.id,
        level: 'error',
        type: 'dashboard_play_failed',
        actor: req.ip,
        detail: `${query}: ${err.message}`,
      });
      res.status(500).json({ error: 'เล่นเพลงไม่สำเร็จ ลองค้นด้วยชื่อเพลงแทนลิงก์' });
    }
  });

  app.post('/guild/:id/control', requireAuth, express.json(), async (req, res) => {
    const queue = client.distube.getQueue(req.params.id);
    if (!queue) return res.status(400).json({ error: 'ตอนนี้ไม่มีเพลงเล่นอยู่' });

    try {
      switch (req.body.action) {
        case 'pause':
          await queue.pause();
          break;
        case 'resume':
          await queue.resume();
          break;
        case 'skip':
          await queue.skip();
          break;
        case 'stop':
          await queue.stop();
          break;
        case 'volume': {
          const level = Math.min(100, Math.max(0, parseInt(req.body.level, 10) || 0));
          queue.setVolume(level);
          break;
        }
        default:
          return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      }
      logEvent({
        guildId: req.params.id,
        type: 'dashboard_control',
        actor: req.ip,
        detail: req.body.action === 'volume' ? `volume ${req.body.level}%` : req.body.action,
      });
      res.json({ ok: true });
    } catch (err) {
      // skip() throws when nothing is queued after the current song
      res.status(400).json({ error: err.message || 'ทำคำสั่งไม่สำเร็จ' });
    }
  });

  // Activity log. /logs shows events that are not tied to a server (logins, start-ups);
  // /guild/:id/logs shows that server's playback history.
  app.get('/logs', requireAuth, (req, res) => {
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.send(
      logsPage({
        events: getEvents({ guildId: null, level, limit: 300 }),
        level,
        bot: botInfo(),
        scope: { title: 'บันทึกระบบ', subtitle: 'เหตุการณ์ที่ไม่ผูกกับเซิร์ฟเวอร์ใดเซิร์ฟเวอร์หนึ่ง' },
        basePath: '/logs',
        tab: 'events',
      }),
    );
  });

  // Raw console output from the bot process.
  app.get('/logs/console', requireAuth, (req, res) => {
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.send(
      consoleLogsPage({
        lines: getConsoleLogs({ level, limit: 300 }),
        level,
        bot: botInfo(),
      }),
    );
  });

  app.get('/logs/console.json', requireAuth, (req, res) => {
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.json({ lines: getConsoleLogs({ level, limit: 300 }) });
  });

  app.get('/guild/:id/logs', requireAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.send(
      logsPage({
        events: getEvents({ guildId: guild.id, level, limit: 300 }),
        level,
        bot: botInfo(),
        scope: { title: `บันทึกของ ${guild.name}`, subtitle: 'ประวัติการเล่นเพลงและการใช้คำสั่ง', backTo: `/guild/${guild.id}` },
        basePath: `/guild/${guild.id}/logs`,
      }),
    );
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard listening on port ${port}`);
  });
}

module.exports = startDashboard;
