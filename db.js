const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'bot.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

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
};

const selectStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const upsertStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, default_volume, announce_channel_id, dj_role_id, disabled_commands)
  VALUES (@guild_id, @default_volume, @announce_channel_id, @dj_role_id, @disabled_commands)
  ON CONFLICT(guild_id) DO UPDATE SET
    default_volume = excluded.default_volume,
    announce_channel_id = excluded.announce_channel_id,
    dj_role_id = excluded.dj_role_id,
    disabled_commands = excluded.disabled_commands
`);

function getGuildSettings(guildId) {
  const row = selectStmt.get(guildId);
  if (!row) return { ...DEFAULTS, guild_id: guildId };
  return { ...row, disabled_commands: JSON.parse(row.disabled_commands) };
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
  });
  return getGuildSettings(guildId);
}

module.exports = { getGuildSettings, saveGuildSettings, logEvent, getEvents };
