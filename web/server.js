const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { ChannelType, PermissionsBitField } = require('discord.js');
const {
  getGuildSettings,
  saveGuildSettings,
  logEvent,
  getEvents,
  getSongHistory,
  getTopSongs,
  getHistoryStats,
  getHistorySongByUrl,
  addLoopSong,
  removeLoopSong,
  getLoopSongs,
} = require('../db');
const { resolveSong } = require('../lib/ytDlpPlugin');
const { getConsoleLogs } = require('../lib/consoleCapture');
const { PROFILES: AUDIO_PROFILES, isValidProfile, profileChain } = require('../lib/audioProfiles');
const accounts = require('../lib/accounts');
const oauth = require('../lib/discordOAuth');
const {
  loginPage,
  registerPage,
  accountPage,
  guildListPage,
  guildSettingsPage,
  logsPage,
  consoleLogsPage,
  historyPage,
  systemPage,
  systemFields,
} = require('./views');
const { snapshot } = require('../lib/systemStats');


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

function startDashboard(botHub) {
  // Bootstrap an admin account from DASHBOARD_PASSWORD so a freshly upgraded deployment is
  // never locked out. After that, everyone signs in with their own account.
  accounts.seedAdmin(process.env.DASHBOARD_PASSWORD);
  if (!process.env.DASHBOARD_PASSWORD && accounts.userCount() === 0) {
    console.warn('No users yet and DASHBOARD_PASSWORD is not set — register the first account at /register (it becomes the admin).');
  }
  const discordEnabled = oauth.isEnabled();

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
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  function currentUser(req) {
    return req.session.userId ? accounts.getUserById(req.session.userId) : null;
  }

  function requireAuth(req, res, next) {
    const user = currentUser(req);
    if (!user) return res.redirect('/login');
    req.user = user;
    // Every authed request acts through the user's chosen bot: their own bot if it's online,
    // otherwise the shared system bot.
    req.botClient = botHub.clientForUser(user) || botHub.getSystemClient();
    return next();
  }

  const redirectUri = (req) =>
    (process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`) +
    '/auth/discord/callback';

  app.get('/login', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    res.send(loginPage({ discordEnabled, notice: req.query.registered ? 'สมัครสำเร็จ! เข้าสู่ระบบได้เลย' : null }));
  });

  app.post('/login', (req, res) => {
    const ip = req.ip;
    if (isLockedOut(ip)) {
      logEvent({ level: 'warn', type: 'login_locked', actor: ip });
      return res.status(429).send(loginPage({ discordEnabled, error: 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' }));
    }
    const user = accounts.authenticate(req.body.login || '', req.body.password || '');
    if (user) {
      loginAttempts.delete(ip);
      req.session.userId = user.id;
      logEvent({ type: 'login_ok', actor: user.username });
      return res.redirect('/');
    }
    recordFailedAttempt(ip);
    logEvent({ level: 'warn', type: 'login_failed', actor: `${req.body.login || ''} · ${ip}` });
    return res.status(401).send(loginPage({ discordEnabled, values: { login: req.body.login }, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }));
  });

  app.get('/register', (req, res) => {
    if (currentUser(req)) return res.redirect('/');
    res.send(registerPage({ discordEnabled }));
  });

  app.post('/register', (req, res) => {
    if (isLockedOut(req.ip)) return res.status(429).send(registerPage({ discordEnabled, error: 'ลองมากเกินไป กรุณารอสักครู่' }));
    const { username, email, password } = req.body;
    const result = accounts.registerUser({ username, email, password });
    if (result.error) {
      return res.status(400).send(registerPage({ discordEnabled, values: { username, email }, error: result.error }));
    }
    req.session.userId = result.user.id;
    logEvent({ type: 'user_registered', actor: result.user.username });
    return res.redirect('/');
  });

  // ---- Login with Discord ----
  app.get('/auth/discord', (req, res) => {
    if (!discordEnabled) return res.redirect('/login');
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    res.redirect(oauth.authorizeUrl(state, redirectUri(req)));
  });

  app.get('/auth/discord/callback', async (req, res) => {
    if (!discordEnabled) return res.redirect('/login');
    if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
      return res.status(400).send(loginPage({ discordEnabled, error: 'การเข้าสู่ระบบด้วย Discord ล้มเหลว (state ไม่ตรง)' }));
    }
    req.session.oauthState = null;
    try {
      const token = await oauth.exchangeCode(req.query.code, redirectUri(req));
      const profile = await oauth.fetchUser(token.access_token);
      const user = accounts.upsertDiscordUser(profile);
      req.session.userId = user.id;
      try {
        req.session.managedGuildIds = await oauth.fetchManagedGuildIds(token.access_token);
      } catch {
        req.session.managedGuildIds = [];
      }
      logEvent({ type: 'login_discord', actor: user.username });
      return res.redirect('/');
    } catch (e) {
      logEvent({ level: 'warn', type: 'login_discord_failed', detail: e.message });
      return res.status(502).send(loginPage({ discordEnabled, error: 'เชื่อมต่อ Discord ไม่สำเร็จ ลองใหม่อีกครั้ง' }));
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  // ---- Account & bot mode ----
  app.get('/account', requireAuth, (req, res) => {
    res.send(
      accountPage({
        user: req.user,
        bot: botInfo(req),
        guild: menuGuild(req),
        saved: req.query.saved === '1',
        error: req.query.error || null,
      }),
    );
  });

  app.post('/account/mode', requireAuth, (req, res) => {
    accounts.setBotMode(req.user.id, req.body.bot_mode === 'own' ? 'own' : 'system');
    if (req.body.bot_mode !== 'own') botHub.disconnectUserBot(req.user.id);
    res.redirect('/account?saved=1');
  });

  app.post('/account/bot-token', requireAuth, async (req, res) => {
    const token = String(req.body.token || '').trim();
    if (!token) return res.redirect('/account?error=' + encodeURIComponent('กรุณาวางโทเคนบอท'));
    try {
      const botUser = await oauth.validateBotToken(token);
      accounts.setBotMode(req.user.id, 'own');
      accounts.setOwnBotToken(req.user.id, token, { status: 'connecting', username: botUser.username });
      const result = await botHub.connectUserBot(req.user.id, token);
      accounts.updateOwnBotStatus(req.user.id, result.ok ? 'connected' : result.error || 'error', botUser.username);
      logEvent({ type: 'own_bot_connected', actor: req.user.username, detail: `${botUser.username} · ${result.ok ? 'ok' : result.error}` });
      return res.redirect('/account?saved=1');
    } catch (e) {
      logEvent({ level: 'warn', type: 'own_bot_failed', actor: req.user.username, detail: e.message });
      return res.redirect('/account?error=' + encodeURIComponent(e.message));
    }
  });

  app.post('/account/bot-disconnect', requireAuth, (req, res) => {
    botHub.disconnectUserBot(req.user.id);
    accounts.setOwnBotToken(req.user.id, null, { status: null, username: null });
    logEvent({ type: 'own_bot_disconnected', actor: req.user.username });
    res.redirect('/account?saved=1');
  });

  function botInfo(req) {
    return {
      name: req.botClient?.user?.username || 'Music Bot',
      avatarUrl: req.botClient?.user?.displayAvatarURL({ size: 64 }) || null,
    };
  }

  /**
   * The server a page belongs to, or the last one the viewer opened.
   *
   * System-wide pages have no server of their own, and without this the menu's server
   * section would vanish on them — forcing a trip back through the server list to return.
   */
  function menuGuild(req, guild) {
    if (guild) {
      req.session.lastGuildId = guild.id;
      return { id: guild.id, name: guild.name };
    }
    const remembered = req.botClient?.guilds?.cache?.get(req.session.lastGuildId);
    return remembered && canAccessGuild(req, remembered) ? { id: remembered.id, name: remembered.name } : null;
  }

  /**
   * Whether the logged-in user may manage a given server. Own-bot users can manage any server
   * their bot is in (that's how the guild got here). System-bot users must have the Manage
   * Server permission there (learned from their Discord login); admins see everything.
   */
  function canAccessGuild(req, guild) {
    if (!guild) return false;
    if (req.user.role === 'admin' || req.user.bot_mode === 'own') return true;
    return Array.isArray(req.session.managedGuildIds) && req.session.managedGuildIds.includes(guild.id);
  }

  /** The server named in :id, but only if the user is allowed to manage it (else null → 404). */
  function accessibleGuild(req) {
    const guild = req.botClient?.guilds?.cache?.get(req.params.id);
    return guild && canAccessGuild(req, guild) ? guild : null;
  }

  /** Filter a bot's servers down to the ones this user may see. */
  function visibleGuilds(req, all) {
    if (req.user.role === 'admin' || req.user.bot_mode === 'own') return all;
    const ids = req.session.managedGuildIds;
    return Array.isArray(ids) ? all.filter((g) => ids.includes(g.id)) : [];
  }

  app.get('/', requireAuth, (req, res) => {
    // Only the servers the user's active bot is in — natural per-user isolation for own-bot
    // users, and the system bot's servers for everyone else.
    const cache = req.botClient?.guilds?.cache;
    const guilds = cache
      ? visibleGuilds(req, [...cache.values()])
          .map((g) => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            iconUrl: g.iconURL({ size: 128 }) || null,
            playing: req.botClient.distube.getQueue(g.id) ? true : false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
    const hint =
      !guilds.length && req.user.bot_mode === 'own' && !botHub.isUserBotOnline(req.user.id)
        ? 'ยังไม่ได้เชื่อมบอทของคุณ — ไปที่ “บัญชีของฉัน” เพื่อเชื่อมบอท แล้วเชิญบอทเข้าเซิร์ฟเวอร์'
        : null;
    res.send(guildListPage({ guilds, bot: botInfo(req), guild: menuGuild(req), hint }));
  });

  app.get('/guild/:id', requireAuth, (req, res) => {
    const guild = accessibleGuild(req);
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
    menuGuild(req, guild); // remember it for the system-wide pages
    res.send(
      guildSettingsPage({
        guild: { id: guild.id, name: guild.name, iconUrl: guild.iconURL({ size: 128 }) || null },
        settings,
        textChannels,
        roles,
        voiceChannels,
        allCommands: [...req.botClient.commands.keys()],
        saved: req.query.saved === '1',
        bot: botInfo(req),
        recentHistory: getSongHistory(guild.id, 12),
        loopSongs: getLoopSongs(guild.id),
        audioProfiles: AUDIO_PROFILES,
      }),
    );
  });

  app.post('/guild/:id', requireAuth, (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');

    const allCommands = [...req.botClient.commands.keys()];
    const enabled = [].concat(req.body.enabled_commands || []);
    const disabled_commands = allCommands.filter((name) => !enabled.includes(name));

    const volume = Math.min(100, Math.max(0, parseInt(req.body.default_volume, 10) || 0));

    const stay24_7 = req.body.stay_24_7 === 'on';
    const autoplay = req.body.autoplay === 'on';
    const prevProfile = getGuildSettings(guild.id).audio_profile;
    const audio_profile = isValidProfile(req.body.audio_profile) ? req.body.audio_profile : prevProfile;
    saveGuildSettings(guild.id, {
      default_volume: volume,
      announce_channel_id: req.body.announce_channel_id || null,
      dj_role_id: req.body.dj_role_id || null,
      disabled_commands,
      stay_24_7: stay24_7,
      autoplay,
      audio_profile,
    });
    // Without this the new volume would only take effect the next time the bot joins a
    // voice channel, which makes the slider look broken while music is playing.
    const queue = req.botClient.distube.getQueue(guild.id);
    if (queue) queue.setVolume(volume);
    // Apply a changed sound preset to what's playing right now. Re-rendering the stream
    // (seek to the current position) is what makes ffmpeg pick up the new filter chain.
    if (queue && audio_profile !== prevProfile) {
      const af = profileChain(audio_profile);
      if (af) queue.ffmpegArgs.output.af = af;
      else delete queue.ffmpegArgs.output.af;
      queue.seek(queue.currentTime).catch(() => {}); // harmless if it can't re-seek
    }

    logEvent({
      guildId: guild.id,
      type: 'settings_saved',
      actor: req.ip,
      detail:
        `เสียง ${volume}%${queue ? ' (ปรับให้เพลงที่เล่นอยู่ด้วย)' : ''} · อยู่ในห้อง 24/7: ${stay24_7 ? 'เปิด' : 'ปิด'}` +
        ` · เล่นต่อเนื่อง: ${autoplay ? 'เปิด' : 'ปิด'} · เสียง: ${audio_profile}` +
        (disabled_commands.length ? ` · ปิดคำสั่ง: ${disabled_commands.join(', ')}` : ''),
    });

    res.redirect(`/guild/${guild.id}?saved=1`);
  });

  app.get('/guild/:id/status.json', requireAuth, (req, res) => {
    const queue = req.botClient.distube.getQueue(req.params.id);
    if (!queue) return res.json({ playing: false });
    const song = queue.songs[0];
    res.json({
      playing: true,
      paused: queue.paused,
      volume: queue.volume,
      nowPlaying: song?.name || '',
      thumbnail: song?.thumbnail || null,
      uploader: song?.uploader?.name || null,
      source: song?.source || null,
      duration: song?.duration || 0, // seconds; 0 for live streams
      currentTime: queue.currentTime || 0,
      voiceChannel: queue.voice.channel?.name || '',
      voiceChannelId: queue.voice.channel?.id || '',
      queue: queue.songs.map((s) => ({ name: s.name, thumbnail: s.thumbnail || null })),
    });
  });

  // Queue a song straight from the dashboard. The bot joins the chosen voice channel (or the
  // one it is already in) and announces the song in the guild's configured text channel.
  app.post('/guild/:id/play', requireAuth, express.json(), async (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).json({ error: 'ไม่พบเซิร์ฟเวอร์นี้' });

    const query = String(req.body.query || '').trim();
    if (!query) return res.status(400).json({ error: 'กรุณาใส่ชื่อเพลงหรือลิงก์' });

    const existingQueue = req.botClient.distube.getQueue(guild.id);
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

      const song = await resolveSong(req.botClient.distube, query, { member: me });
      if (!song) return res.status(404).json({ error: `ไม่พบเพลง: ${query}` });

      logEvent({
        guildId: guild.id,
        type: 'dashboard_play',
        actor: req.ip,
        detail: `${song.name} → ${voiceChannel.name}`,
      });
      await req.botClient.distube.play(voiceChannel, song, { member: me, textChannel });
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
    const queue = req.botClient.distube.getQueue(req.params.id);
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
        bot: botInfo(req),
        scope: { title: 'บันทึกระบบ', subtitle: 'เหตุการณ์ที่ไม่ผูกกับเซิร์ฟเวอร์ใดเซิร์ฟเวอร์หนึ่ง' },
        basePath: '/logs',
        tab: 'events',
        active: 'logs',
        guild: menuGuild(req),
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
        bot: botInfo(req),
        guild: menuGuild(req),
      }),
    );
  });

  app.get('/logs/console.json', requireAuth, (req, res) => {
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.json({ lines: getConsoleLogs({ level, limit: 300 }) });
  });

  /**
   * Machine readings plus what the bot is currently doing, since the two only mean
   * something together: idle CPU with ten rooms playing reads very differently from idle
   * CPU with none.
   */
  function resourceSnapshot(req) {
    const stats = snapshot();
    stats.bot = {
      guilds: req.botClient.guilds.cache.size,
      playing: [...req.botClient.guilds.cache.keys()].filter((id) => req.botClient.distube.getQueue(id)).length,
      voice: req.botClient.distube.voices.size,
      ping: Number.isFinite(req.botClient.ws.ping) ? Math.max(0, Math.round(req.botClient.ws.ping)) : null,
    };
    return stats;
  }

  app.get('/system', requireAuth, (req, res) => {
    res.send(systemPage({ stats: resourceSnapshot(req), bot: botInfo(req), guild: menuGuild(req) }));
  });

  app.get('/system.json', requireAuth, (req, res) => {
    res.json({ fields: systemFields(resourceSnapshot(req)) });
  });

  // Add a song to the server's loop list. A history pick already carries its metadata (no
  // network); anything typed is resolved through yt-dlp so we store a real playable URL.
  app.post('/guild/:id/loop/add', requireAuth, async (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');
    const back = `/guild/${guild.id}#loop`;
    const fromHistory = (req.body.url || '').trim();
    const query = (req.body.query || '').trim();

    try {
      let song = fromHistory ? getHistorySongByUrl(guild.id, fromHistory) : null;
      if (!song && (query || fromHistory)) {
        const resolved = await resolveSong(req.botClient.distube, query || fromHistory, { member: guild.members.me });
        const one = resolved?.songs ? resolved.songs[0] : resolved; // a playlist → just its first track
        if (one?.url) song = { url: one.url, title: one.name, source: one.source, duration: one.duration };
      }
      if (!song?.url) {
        logEvent({ guildId: guild.id, level: 'warn', type: 'loop_add_failed', detail: query || fromHistory || '(ว่าง)' });
      } else {
        const result = addLoopSong(guild.id, song);
        logEvent({
          guildId: guild.id,
          level: result.ok ? 'info' : 'warn',
          type: result.ok ? 'loop_added' : 'loop_full',
          detail: result.ok ? song.title : `ลิสต์เต็มแล้ว (${song.title})`,
        });
      }
    } catch (e) {
      logEvent({ guildId: guild.id, level: 'warn', type: 'loop_add_failed', detail: e.message });
    }
    res.redirect(back);
  });

  app.post('/guild/:id/loop/remove', requireAuth, (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');
    if (req.body.url) {
      removeLoopSong(guild.id, req.body.url);
      logEvent({ guildId: guild.id, type: 'loop_removed', detail: req.body.url });
    }
    res.redirect(`/guild/${guild.id}#loop`);
  });

  // Start the loop list playing right now: play the first track for instant sound, set the
  // queue to repeat so it cycles forever, then fill in the rest behind it. Resolving each
  // song costs a yt-dlp call, so only the first is awaited — the rest stream in in the
  // background while the queue plays.
  app.post('/guild/:id/loop/play', requireAuth, express.json(), async (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).json({ error: 'ไม่พบเซิร์ฟเวอร์นี้' });

    const loop = getLoopSongs(guild.id);
    if (!loop.length) return res.status(400).json({ error: 'ยังไม่มีเพลงในเพลย์ลิสต์วนซ้ำ' });

    const existingQueue = req.botClient.distube.getQueue(guild.id);
    const channelId = req.body.channelId || existingQueue?.voice.channel?.id;
    const voiceChannel = channelId && guild.channels.cache.get(channelId);
    if (!voiceChannel?.isVoiceBased()) return res.status(400).json({ error: 'กรุณาเลือกห้องเสียง' });

    const me = guild.members.me;
    if (!voiceChannel.permissionsFor(me)?.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
      return res.status(403).json({ error: `บอทไม่มีสิทธิ์เข้า/พูดในห้อง ${voiceChannel.name}` });
    }

    try {
      const settings = getGuildSettings(guild.id);
      const textChannel =
        (settings.announce_channel_id && guild.channels.cache.get(settings.announce_channel_id)) ||
        guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.viewable);

      // Mark every track as a silent bulk-add so the bot doesn't post a "เพิ่มเข้าคิวแล้ว"
      // line for each of them — filling a whole loop list would otherwise spam the channel.
      const silent = { member: me, metadata: { silent: true } };

      const first = await resolveSong(req.botClient.distube, loop[0].url, silent);
      if (!first) return res.status(502).json({ error: 'เล่นเพลงแรกในลิสต์ไม่สำเร็จ' });
      await req.botClient.distube.play(voiceChannel, first, { member: me, textChannel, metadata: { silent: true } });

      const queue = req.botClient.distube.getQueue(guild.id);
      if (queue) queue.setRepeatMode(2); // 2 = repeat the whole queue

      logEvent({ guildId: guild.id, type: 'loop_play', actor: req.ip, detail: `${loop.length} เพลง → ${voiceChannel.name}` });
      res.json({ ok: true, count: loop.length, title: first.name });

      // Queue the remaining songs after replying, so the button returns as soon as sound starts.
      for (const s of loop.slice(1)) {
        if (!req.botClient.distube.getQueue(guild.id)) break; // stopped while we were loading
        try {
          const song = await resolveSong(req.botClient.distube, s.url, silent);
          if (song) await req.botClient.distube.play(voiceChannel, song, { member: me, textChannel, metadata: { silent: true } });
        } catch (e) {
          console.warn(`Loop queue add failed for ${s.url}:`, e.message);
        }
      }
    } catch (err) {
      console.error('Loop play failed:', err);
      logEvent({ guildId: guild.id, level: 'error', type: 'loop_play_failed', actor: req.ip, detail: err.message });
      if (!res.headersSent) res.status(500).json({ error: 'เริ่มเล่นวนซ้ำไม่สำเร็จ' });
    }
  });

  app.get('/guild/:id/history', requireAuth, (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');
    menuGuild(req, guild); // remember it for the system-wide pages
    res.send(
      historyPage({
        guild: { id: guild.id, name: guild.name, iconUrl: guild.iconURL({ size: 128 }) || null },
        history: getSongHistory(guild.id, 200),
        top: getTopSongs(guild.id, 10),
        stats: getHistoryStats(guild.id),
        autoplay: getGuildSettings(guild.id).autoplay,
        bot: botInfo(req),
      }),
    );
  });

  app.get('/guild/:id/logs', requireAuth, (req, res) => {
    const guild = accessibleGuild(req);
    if (!guild) return res.status(404).send('ไม่พบเซิร์ฟเวอร์นี้');
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    res.send(
      logsPage({
        events: getEvents({ guildId: guild.id, level, limit: 300 }),
        level,
        bot: botInfo(req),
        scope: { title: `บันทึกของ ${guild.name}`, subtitle: 'ประวัติการเล่นเพลงและการใช้คำสั่ง' },
        basePath: `/guild/${guild.id}/logs`,
        active: 'guildlogs',
        guild: menuGuild(req, guild),
      }),
    );
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard listening on port ${port}`);
  });
}

module.exports = startDashboard;
