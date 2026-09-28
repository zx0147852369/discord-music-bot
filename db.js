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

module.exports = { getGuildSettings, saveGuildSettings };
