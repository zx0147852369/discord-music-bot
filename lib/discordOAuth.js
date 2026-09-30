// "Login with Discord" (OAuth2). Enabled only when DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
// are set. The client id is the bot application's id; the secret is its OAuth2 client secret.
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const SCOPE = 'identify guilds';

const isEnabled = () => Boolean(CLIENT_ID && CLIENT_SECRET);

function authorizeUrl(state, redirectUri) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    prompt: 'consent',
  });
  return `https://discord.com/api/oauth2/authorize?${p}`;
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  return res.json();
}

async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`fetch user failed (${res.status})`);
  const u = await res.json();
  return {
    id: u.id,
    username: u.global_name || u.username,
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null,
  };
}

/** The guild ids where the user has the Manage Server permission (for system-bot mode). */
async function fetchManagedGuildIds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const guilds = await res.json();
  if (!Array.isArray(guilds)) return [];
  const MANAGE_GUILD = 0x20n;
  return guilds
    .filter((g) => {
      if (g.owner) return true;
      try {
        return (BigInt(g.permissions || 0) & MANAGE_GUILD) !== 0n;
      } catch {
        return false;
      }
    })
    .map((g) => g.id);
}

/**
 * Validate a user-supplied bot token by asking Discord who the bot is. Returns
 * { id, username } on success, or throws with a friendly reason.
 */
async function validateBotToken(token) {
  let res;
  try {
    res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bot ${String(token).trim()}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('เชื่อมต่อ Discord ไม่ได้ ลองใหม่อีกครั้ง');
  }
  if (res.status === 401) throw new Error('โทเคนบอทไม่ถูกต้อง');
  if (!res.ok) throw new Error(`ตรวจสอบโทเคนไม่สำเร็จ (HTTP ${res.status})`);
  const u = await res.json();
  return { id: u.id, username: u.global_name || u.username };
}

module.exports = { isEnabled, authorizeUrl, exchangeCode, fetchUser, fetchManagedGuildIds, validateBotToken };
