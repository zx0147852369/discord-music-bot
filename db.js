const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Settings and logs must survive redeploys. A host's mounted volume is the only writable
// place that does, so use it automatically rather than relying on someone remembering to
// point DB_PATH at it — writing to the app directory silently loses everything on deploy.
function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'bot.sqlite');
  }
  return path.join(__dirname, 'data', 'bot.sqlite');
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const onVolume = Boolean(process.env.DB_PATH || process.env.RAILWAY_VOLUME_MOUNT_PATH);
console.log(`Database: ${dbPath}${onVolume ? '' : ' (not on a persistent volume — settings reset on redeploy)'}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    default_volume INTEGER NOT NULL DEFAULT 50,
    announce_channel_id TEXT,
    dj_role_id TEXT,
    disabled_commands TEXT NOT NULL DEFAULT '[]'
  )
`);

// Added after the table shipped, so bring existing databases up to date.
const settingsColumns = db.prepare('PRAGMA table_info(guild_settings)').all().map((c) => c.name);
if (!settingsColumns.includes('stay_24_7')) {
  db.exec('ALTER TABLE guild_settings ADD COLUMN stay_24_7 INTEGER NOT NULL DEFAULT 1');
}
if (!settingsColumns.includes('autoplay')) {
  db.exec('ALTER TABLE guild_settings ADD COLUMN autoplay INTEGER NOT NULL DEFAULT 1');
}

// Every song the bot has played, per server. Doubles as the source for "keep the music
// going" — when a queue runs dry the bot picks the next track from what this server likes.
db.exec(`
  CREATE TABLE IF NOT EXISTS song_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    played_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    source TEXT,
    duration INTEGER,
    requested_by TEXT,
    auto INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_history_guild ON song_history (guild_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_history_url ON song_history (guild_id, url);
`);

const MAX_HISTORY = 5000;

const insertHistoryStmt = db.prepare(`
  INSERT INTO song_history (guild_id, played_at, title, url, source, duration, requested_by, auto)
  VALUES (@guild_id, @played_at, @title, @url, @source, @duration, @requested_by, @auto)
`);
const pruneHistoryStmt = db.prepare('DELETE FROM song_history WHERE id <= (SELECT MAX(id) FROM song_history) - ?');
const recentHistoryStmt = db.prepare('SELECT * FROM song_history WHERE guild_id = ? ORDER BY id DESC LIMIT ?');
const recentUrlsStmt = db.prepare('SELECT url FROM song_history WHERE guild_id = ? AND url IS NOT NULL ORDER BY id DESC LIMIT ?');
const topSongsStmt = db.prepare(`
  SELECT title, url, source, COUNT(*) AS plays, MAX(played_at) AS last_played
  FROM song_history WHERE guild_id = ?
  GROUP BY COALESCE(url, title)
  ORDER BY plays DESC, last_played DESC
  LIMIT ?
`);
const historyStatsStmt = db.prepare(`
  SELECT COUNT(*) AS total, COUNT(DISTINCT COALESCE(url, title)) AS unique_songs,
         SUM(auto) AS auto_plays
  FROM song_history WHERE guild_id = ?
`);
const randomPastStmt = db.prepare(`
  SELECT title, url FROM song_history
  WHERE guild_id = ? AND url IS NOT NULL
  GROUP BY url ORDER BY RANDOM() LIMIT ?
`);

let historySincePrune = 0;

function recordSongPlay({ guildId, title, url = null, source = null, duration = null, requestedBy = null, auto = false }) {
  try {
    insertHistoryStmt.run({
      guild_id: guildId,
      played_at: Date.now(),
      title: String(title).slice(0, 300),
      url,
      source,
      duration: duration == null ? null : Math.round(duration),
      requested_by: requestedBy,
      auto: auto ? 1 : 0,
    });
    if (++historySincePrune >= 200) {
      historySincePrune = 0;
      pruneHistoryStmt.run(MAX_HISTORY);
    }
  } catch (e) {
    console.error('Failed to record song history:', e.message);
  }
}

const getSongHistory = (guildId, limit = 100) => recentHistoryStmt.all(guildId, Math.min(500, Math.max(1, limit)));
const getTopSongs = (guildId, limit = 10) => topSongsStmt.all(guildId, Math.min(50, Math.max(1, limit)));
const getHistoryStats = (guildId) => historyStatsStmt.get(guildId) || { total: 0, unique_songs: 0, auto_plays: 0 };
const getRecentlyPlayedUrls = (guildId, limit = 30) => recentUrlsStmt.all(guildId, limit).map((r) => r.url);
const getRandomPastSongs = (guildId, limit = 5) => randomPastStmt.all(guildId, limit);

// Activity log. guild_id is NULL for events that are not tied to a server (dashboard
// logins, bot start-up).
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    created_at INTEGER NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    type TEXT NOT NULL,
    actor TEXT,
    detail TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_guild_time ON events (guild_id, id DESC);
`);

const MAX_EVENTS = 5000;

const insertEventStmt = db.prepare(`
  INSERT INTO events (guild_id, created_at, level, type, actor, detail)
  VALUES (@guild_id, @created_at, @level, @type, @actor, @detail)
`);
const pruneEventsStmt = db.prepare(`
  DELETE FROM events WHERE id <= (SELECT MAX(id) FROM events) - ?
`);
const selectEventsStmt = db.prepare(`
  SELECT * FROM events WHERE guild_id IS ? ORDER BY id DESC LIMIT ?
`);
const selectEventsByLevelStmt = db.prepare(`
  SELECT * FROM events WHERE guild_id IS ? AND level = ? ORDER BY id DESC LIMIT ?
`);

let sinceLastPrune = 0;

/**
 * Record one activity entry. Logging must never break playback, so failures are swallowed
 * after being reported to the console.
 */
function logEvent({ guildId = null, level = 'info', type, actor = null, detail = null }) {
  try {
    insertEventStmt.run({
      guild_id: guildId,
      created_at: Date.now(),
      level,
      type,
      actor,
      detail: detail == null ? null : String(detail).slice(0, 500),
    });
    // Keep the table bounded so a long-running bot can't fill the volume.
    if (++sinceLastPrune >= 200) {
      sinceLastPrune = 0;
      pruneEventsStmt.run(MAX_EVENTS);
    }
  } catch (e) {
    console.error('Failed to write log event:', e.message);
  }
}

function getEvents({ guildId = null, level = null, limit = 200 } = {}) {
  const capped = Math.min(1000, Math.max(1, limit));
  return level
    ? selectEventsByLevelStmt.all(guildId, level, capped)
    : selectEventsStmt.all(guildId, capped);
}

const DEFAULTS = {
  guild_id: '',
  default_volume: 50,
  announce_channel_id: null,
  dj_role_id: null,
  disabled_commands: [],
  stay_24_7: true,
  autoplay: true,
};

const selectStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const upsertStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, default_volume, announce_channel_id, dj_role_id, disabled_commands, stay_24_7, autoplay)
  VALUES (@guild_id, @default_volume, @announce_channel_id, @dj_role_id, @disabled_commands, @stay_24_7, @autoplay)
  ON CONFLICT(guild_id) DO UPDATE SET
    default_volume = excluded.default_volume,
    announce_channel_id = excluded.announce_channel_id,
    dj_role_id = excluded.dj_role_id,
    disabled_commands = excluded.disabled_commands,
    stay_24_7 = excluded.stay_24_7,
    autoplay = excluded.autoplay
`);

function getGuildSettings(guildId) {
  const row = selectStmt.get(guildId);
  if (!row) return { ...DEFAULTS, guild_id: guildId };
  return {
    ...row,
    disabled_commands: JSON.parse(row.disabled_commands),
    stay_24_7: Boolean(row.stay_24_7),
    autoplay: Boolean(row.autoplay),
  };
}

function saveGuildSettings(guildId, settings) {
  const current = getGuildSettings(guildId);
  const merged = { ...current, ...settings, guild_id: guildId };
  upsertStmt.run({
    guild_id: merged.guild_id,
    default_volume: merged.default_volume,
    announce_channel_id: merged.announce_channel_id || null,
    dj_role_id: merged.dj_role_id || null,
    disabled_commands: JSON.stringify(merged.disabled_commands || []),
    stay_24_7: merged.stay_24_7 ? 1 : 0,
    autoplay: merged.autoplay ? 1 : 0,
  });
  return getGuildSettings(guildId);
}

module.exports = {
  dbPath,
  getGuildSettings,
  saveGuildSettings,
  logEvent,
  getEvents,
  recordSongPlay,
  getSongHistory,
  getTopSongs,
  getHistoryStats,
  getRecentlyPlayedUrls,
  getRandomPastSongs,
};
