const crypto = require('crypto');

// Encrypts small secrets (a user's own Discord bot token) at rest with AES-256-GCM.
// The key is derived from APP_ENCRYPTION_KEY (preferred) or SESSION_SECRET. In production set
// a dedicated, stable APP_ENCRYPTION_KEY — if the key changes, previously stored tokens can no
// longer be decrypted (decrypt() returns null and the user simply re-enters their token).
const rawKey = process.env.APP_ENCRYPTION_KEY || process.env.SESSION_SECRET || '';
if (!rawKey && process.env.NODE_ENV === 'production') {
  console.warn('APP_ENCRYPTION_KEY/SESSION_SECRET not set — stored bot tokens use a weak default key.');
}
const KEY = crypto.createHash('sha256').update(String(rawKey || 'insecure-development-key')).digest();

/** Returns an opaque string safe to store in the database, or '' for empty input. */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

/** Reverses encrypt(). Returns null if the blob is missing, malformed, or fails authentication. */
function decrypt(blob) {
  if (!blob || typeof blob !== 'string') return null;
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const data = Buffer.from(parts[3], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** A short, non-reversible fingerprint of a token, safe to show in the UI (e.g. "…a1b2"). */
function hint(token) {
  const t = String(token || '');
  return t.length >= 4 ? '…' + t.slice(-4) : '';
}

module.exports = { encrypt, decrypt, hint };
