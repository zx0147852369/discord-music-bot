const crypto = require('crypto');
const { db } = require('../db');
const secretbox = require('./secretbox');

// User accounts for the multi-user dashboard. Each user's data (which servers they manage,
// their bot mode, their own bot token) is isolated by user id.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    discord_id TEXT UNIQUE,
    discord_username TEXT,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    bot_mode TEXT NOT NULL DEFAULT 'system',
    own_bot_token TEXT,
    own_bot_status TEXT,
    own_bot_username TEXT,
    created_at INTEGER NOT NULL,
    last_login INTEGER
  );
`);

// ---- password hashing (scrypt, no external deps) ----------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, saltHex, hashHex] = stored.split('$');
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// ---- validation -------------------------------------------------------------------------
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ username, email, password }) {
  if (!USERNAME_RE.test(String(username || ''))) return 'ชื่อผู้ใช้ต้องยาว 3–32 ตัว (a–z, 0–9, _ . -)';
  if (!EMAIL_RE.test(String(email || ''))) return 'อีเมลไม่ถูกต้อง';
  if (String(password || '').length < 8) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
  return null;
}

// ---- row shaping ------------------------------------------------------------------------
function shape(row) {
  if (!row) return null;
  const { password_hash, own_bot_token, ...safe } = row;
  return {
    ...safe,
    hasPassword: Boolean(password_hash),
    hasOwnToken: Boolean(own_bot_token),
  };
}

const byIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const byUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
const byEmailStmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
const byDiscordStmt = db.prepare('SELECT * FROM users WHERE discord_id = ?');
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM users');

const getUserById = (id) => shape(byIdStmt.get(id));
const userCount = () => countStmt.get().n;

/** Look up by username OR email (case-insensitive), for the login form. */
function findByLogin(login) {
  const l = String(login || '').trim();
  return byUsernameStmt.get(l) || byEmailStmt.get(l) || null;
}

// ---- create / auth ----------------------------------------------------------------------
const insertStmt = db.prepare(`
  INSERT INTO users (username, email, password_hash, discord_id, discord_username, avatar, role, bot_mode, created_at)
  VALUES (@username, @email, @password_hash, @discord_id, @discord_username, @avatar, @role, @bot_mode, @created_at)
`);

/**
 * Register a new email/password account. The very first account created becomes the admin.
 * Returns { user } on success or { error } with a message.
 */
function registerUser({ username, email, password }) {
  const err = validateRegistration({ username, email, password });
  if (err) return { error: err };
  if (byUsernameStmt.get(username)) return { error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' };
  if (byEmailStmt.get(email)) return { error: 'อีเมลนี้ถูกใช้แล้ว' };
  const info = insertStmt.run({
    username: String(username).trim(),
    email: String(email).trim().toLowerCase(),
    password_hash: hashPassword(password),
    discord_id: null,
    discord_username: null,
    avatar: null,
    role: userCount() === 0 ? 'admin' : 'user',
    bot_mode: 'system',
    created_at: Date.now(),
  });
  return { user: getUserById(info.lastInsertRowid) };
}

/**
 * Bootstrap: if there are no users yet and DASHBOARD_PASSWORD is set, create an admin account
 * (username "admin") so the operator is never locked out of a freshly upgraded deployment.
 */
function seedAdmin(password) {
  if (userCount() > 0 || !password) return null;
  const info = insertStmt.run({
    username: 'admin',
    email: null,
    password_hash: hashPassword(password),
    discord_id: null,
    discord_username: null,
    avatar: null,
    role: 'admin',
    bot_mode: 'system',
    created_at: Date.now(),
  });
  return getUserById(info.lastInsertRowid);
}

/** Verify an email/password login. Returns the safe user on success, or null. */
function authenticate(login, password) {
  const row = findByLogin(login);
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), row.id);
  return shape(row);
}

/**
 * Find or create a user from a Discord OAuth profile. Links to an existing account with the
 * same discord_id, otherwise creates one (username derived from the Discord handle).
 */
function upsertDiscordUser({ id, username, avatar }) {
  const existing = byDiscordStmt.get(id);
  if (existing) {
    db.prepare('UPDATE users SET discord_username = ?, avatar = ?, last_login = ? WHERE id = ?').run(
      username || existing.discord_username,
      avatar || existing.avatar,
      Date.now(),
      existing.id,
    );
    return getUserById(existing.id);
  }
  let handle = String(username || 'user').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 28) || 'user';
  if (handle.length < 3) handle = 'dc_' + handle;
  while (byUsernameStmt.get(handle)) handle = handle.slice(0, 26) + Math.floor(Math.random() * 1000);
  const info = insertStmt.run({
    username: handle,
    email: null,
    password_hash: null,
    discord_id: String(id),
    discord_username: username || null,
    avatar: avatar || null,
    role: userCount() === 0 ? 'admin' : 'user',
    bot_mode: 'system',
    created_at: Date.now(),
  });
  return getUserById(info.lastInsertRowid);
}

// ---- bot mode & own token ---------------------------------------------------------------
/** Set the user's bot mode ('system' | 'own'). Returns the updated safe user. */
function setBotMode(userId, mode) {
  const m = mode === 'own' ? 'own' : 'system';
  db.prepare('UPDATE users SET bot_mode = ? WHERE id = ?').run(m, userId);
  return getUserById(userId);
}

/** Store the user's own bot token (encrypted). Pass null to clear it. */
function setOwnBotToken(userId, token, { status = null, username = null } = {}) {
  db.prepare('UPDATE users SET own_bot_token = ?, own_bot_status = ?, own_bot_username = ? WHERE id = ?').run(
    token ? secretbox.encrypt(token) : null,
    status,
    username,
    userId,
  );
  return getUserById(userId);
}

function updateOwnBotStatus(userId, status, username) {
  db.prepare('UPDATE users SET own_bot_status = ?, own_bot_username = COALESCE(?, own_bot_username) WHERE id = ?').run(
    status,
    username || null,
    userId,
  );
}

/** Decrypt and return a user's own bot token, or null. Never send this to the browser. */
function getOwnBotToken(userId) {
  const row = byIdStmt.get(userId);
  return row && row.own_bot_token ? secretbox.decrypt(row.own_bot_token) : null;
}

/** All users who have chosen 'own' mode and stored a token — used to boot their bots. */
function listOwnBotUsers() {
  return db
    .prepare("SELECT id FROM users WHERE bot_mode = 'own' AND own_bot_token IS NOT NULL")
    .all()
    .map((r) => ({ id: r.id, token: getOwnBotToken(r.id) }))
    .filter((u) => u.token);
}

module.exports = {
  registerUser,
  seedAdmin,
  authenticate,
  upsertDiscordUser,
  getUserById,
  userCount,
  setBotMode,
  setOwnBotToken,
  updateOwnBotStatus,
  getOwnBotToken,
  listOwnBotUsers,
  hashPassword,
  verifyPassword,
  validateRegistration,
};
