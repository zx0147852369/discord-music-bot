function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function avatar(name, url, size = 40) {
  if (url) {
    return `<img class="avatar" src="${escapeHtml(url)}" alt="" style="width:${size}px;height:${size}px;">`;
  }
  return `<div class="avatar avatar-fallback" style="width:${size}px;height:${size}px;font-size:${Math.max(11, size * 0.38)}px;">${escapeHtml(initials(name))}</div>`;
}

const ICONS = {
  volume: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 5V4L8 9H4Z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M18.8 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></svg>',
  channel: '<svg viewBox="0 0 24 24" fill="none"><path d="M9.5 3.5 8 20.5M15.5 3.5 14 20.5M4 8.5h16M3.5 15.5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  toggle: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="12" r="2.4" fill="currentColor"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18V5l11-2v13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="16" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none"><path d="M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 18.5V20M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 20v-1.5a3 3 0 0 0-2-2.83M15.5 4.2a3 3 0 0 1 0 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function fontsAndReset() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%235865F2"/><text x="50" y="66" font-size="52" text-anchor="middle" fill="white" font-family="sans-serif">♪</text></svg>')}">`;
}

function layout({ title, body, bare }) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${fontsAndReset()}
<style>
  :root {
    color-scheme: dark;
    --bg: #0d0e12;
    --bg-glow-1: #5865f2;
    --bg-glow-2: #eb459e;
    --surface: #17181f;
    --surface-2: #1e2029;
    --surface-hover: #24262f;
    --border: rgba(255,255,255,0.08);
    --border-strong: rgba(255,255,255,0.14);
    --text: #f2f3f7;
    --text-muted: #93949f;
    --text-faint: #62636d;
    --accent: #5865f2;
    --accent-hover: #6f79f5;
    --accent-soft: rgba(88,101,242,0.15);
    --success: #23a55a;
    --success-soft: rgba(35,165,90,0.15);
    --danger: #f23f42;
    --danger-soft: rgba(242,63,66,0.12);
    --radius: 14px;
    --shadow: 0 8px 24px rgba(0,0,0,0.35);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: 'Inter', 'Noto Sans Thai', -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    position: relative;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(600px circle at 8% -10%, rgba(88,101,242,0.20), transparent 60%),
      radial-gradient(500px circle at 100% 0%, rgba(235,69,158,0.12), transparent 55%);
    pointer-events: none;
  }
  a { color: inherit; }
  ::selection { background: var(--accent-soft); }

  header.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 28px;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(10px);
    background: rgba(13,14,18,0.7);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .brand-name { font-weight: 700; font-size: 15px; letter-spacing: .1px; }
  .brand-sub { font-size: 12px; color: var(--text-faint); font-weight: 500; }
  .icon-link {
    display: inline-flex; align-items: center; gap: 7px;
    color: var(--text-muted); text-decoration: none; font-size: 13.5px; font-weight: 600;
    padding: 8px 12px; border-radius: 9px; transition: all .15s ease;
  }
  .icon-link:hover { color: var(--text); background: var(--surface-2); }
  .icon-link svg { width: 16px; height: 16px; }

  main { max-width: 760px; margin: 0 auto; padding: 36px 20px 64px; }
  main.narrow { max-width: 420px; }

  .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -.2px; }
  .page-sub { color: var(--text-muted); font-size: 14px; margin: 0 0 28px; }

  .card {
    background: linear-gradient(180deg, var(--surface) 0%, var(--surface) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 26px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
  }
  .section-head {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 4px;
  }
  .section-icon {
    width: 30px; height: 30px; border-radius: 9px;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .section-icon svg { width: 16px; height: 16px; }
  h2.section-title { font-size: 15.5px; font-weight: 700; margin: 0; }
  .section-desc { font-size: 12.5px; color: var(--text-faint); margin: 2px 0 0 40px; }

  .field { margin-top: 22px; }
  .field label.field-label {
    display: block; font-size: 12.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: .4px;
  }
  input[type=text], input[type=password], select {
    width: 100%;
    padding: 11px 13px;
    border-radius: 9px;
    border: 1px solid var(--border-strong);
    background: var(--surface-2);
    color: var(--text);
    font-size: 14px;
    font-family: inherit;
    transition: border-color .15s ease, background .15s ease;
    appearance: none;
  }
  select {
    background-image: url('data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"><path d="M5 7.5 10 12.5 15 7.5" stroke="%2393949f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')}');
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }
  input:focus, select:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--surface-hover);
  }

  .volume-row { display: flex; align-items: center; gap: 16px; }
  input[type=range] {
    flex: 1;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
    outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--accent);
    border: 3px solid #fff2;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(88,101,242,0.5);
  }
  input[type=range]::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--accent); border: none; cursor: pointer;
  }
  .volume-value {
    min-width: 48px; text-align: center;
    font-variant-numeric: tabular-nums;
    font-weight: 700; font-size: 14px;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: 8px; padding: 6px 4px;
  }

  .command-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .cmd-toggle {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    background: var(--surface-2);
    cursor: pointer;
    transition: border-color .15s ease, background .15s ease;
  }
  .cmd-toggle:hover { border-color: var(--border-strong); background: var(--surface-hover); }
  .cmd-toggle span.cmd-name { font-size: 13.5px; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace; }
  .switch { position: relative; width: 34px; height: 20px; flex-shrink: 0; }
  .switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
  .switch .track {
    position: absolute; inset: 0; border-radius: 999px;
    background: var(--border-strong);
    transition: background .15s ease;
  }
  .switch .thumb {
    position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
    background: #fff; transition: transform .15s ease;
  }
  .switch input:checked + .track { background: var(--success); }
  .switch input:checked + .track .thumb,
  .switch input:checked ~ .thumb { transform: translateX(14px); }

  button.primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 12px 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    margin-top: 28px;
    transition: background .15s ease, transform .1s ease;
    box-shadow: 0 4px 14px rgba(88,101,242,0.35);
  }
  button.primary:hover { background: var(--accent-hover); }
  button.primary:active { transform: scale(.98); }

  .saved-toast {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--success); font-size: 13px; font-weight: 600;
    margin-left: 14px;
  }
  .saved-toast::before { content: "✓"; }

  .guild-list { display: grid; gap: 10px; margin-top: 4px; }
  .guild-row {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-decoration: none;
    color: var(--text);
    transition: transform .12s ease, border-color .15s ease, background .15s ease;
  }
  .guild-row:hover { background: var(--surface-hover); border-color: var(--border-strong); transform: translateY(-1px); }
  .guild-row .meta { flex: 1; min-width: 0; }
  .guild-row .g-name { font-weight: 700; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .guild-row .g-sub { font-size: 12px; color: var(--text-faint); display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .guild-row .g-sub svg { width: 12px; height: 12px; }
  .chevron { color: var(--text-faint); flex-shrink: 0; }

  .avatar { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .avatar-fallback {
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    color: white; display: flex; align-items: center; justify-content: center;
    font-weight: 700; letter-spacing: .5px;
  }

  .badge-live {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; color: var(--success);
    background: var(--success-soft); padding: 3px 8px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: .3px;
  }
  .badge-live .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

  .empty-state { text-align: center; padding: 30px 10px; color: var(--text-faint); font-size: 13.5px; }

  .np-card { display: flex; align-items: center; gap: 14px; }
  .eq { display: flex; align-items: flex-end; gap: 3px; width: 22px; height: 18px; flex-shrink: 0; }
  .eq span { width: 4px; background: var(--accent); border-radius: 2px; animation: eq 0.9s ease-in-out infinite; }
  .eq span:nth-child(1) { height: 40%; animation-delay: -0.6s; }
  .eq span:nth-child(2) { height: 100%; animation-delay: -0.2s; }
  .eq span:nth-child(3) { height: 65%; animation-delay: -0.9s; }
  @keyframes eq { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
  .np-title { font-weight: 700; font-size: 14.5px; }
  .np-sub { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }
  .np-queue { margin: 14px 0 0; padding: 0; list-style: none; }
  .np-queue li {
    padding: 8px 10px; font-size: 13px; color: var(--text-muted);
    border-top: 1px solid var(--border);
    display: flex; gap: 8px;
  }
  .np-queue li .idx { color: var(--text-faint); font-variant-numeric: tabular-nums; }

  .login-card { max-width: 380px; margin: 12vh auto 0; text-align: center; }
  .login-logo { margin: 0 auto 18px; }
  .login-title { font-size: 20px; font-weight: 800; margin: 0 0 6px; }
  .login-sub { font-size: 13.5px; color: var(--text-muted); margin: 0 0 26px; }
  .login-card form { text-align: left; }
  .error-box {
    background: var(--danger-soft); color: #ff8789;
    border: 1px solid rgba(242,63,66,0.35);
    padding: 10px 14px; border-radius: 9px;
    font-size: 13px; margin-top: 16px;
  }
  button.primary.full { width: 100%; }

  @media (max-width: 560px) {
    main { padding: 24px 14px 48px; }
    .card { padding: 18px; }
    header.topbar { padding: 12px 16px; }
    .command-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function loginPage({ error, bot } = {}) {
  const logo = bot?.avatarUrl
    ? `<img src="${escapeHtml(bot.avatarUrl)}" alt="" style="width:64px;height:64px;border-radius:18px;">`
    : `<div class="avatar-fallback" style="width:64px;height:64px;border-radius:18px;font-size:24px;">${escapeHtml(initials(bot?.name || 'DJ'))}</div>`;
  return layout({
    title: 'เข้าสู่ระบบ - ' + (bot?.name || 'Music Bot'),
    body: `
<main class="narrow">
  <div class="login-card">
    <div class="login-logo">${logo}</div>
    <h1 class="login-title">${escapeHtml(bot?.name || 'Music Bot')} Dashboard</h1>
    <p class="login-sub">ใส่รหัสผ่านเพื่อจัดการการตั้งค่าบอท</p>
    <div class="card">
      <form method="POST" action="/login">
        <div class="field" style="margin-top:0;">
          <label class="field-label" for="password">รหัสผ่าน</label>
          <input type="password" id="password" name="password" autofocus required placeholder="••••••••">
        </div>
        ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ''}
        <button type="submit" class="primary full">เข้าสู่ระบบ</button>
      </form>
    </div>
  </div>
</main>`,
  });
}

function headerNav(bot) {
  const logo = bot?.avatarUrl
    ? `<img src="${escapeHtml(bot.avatarUrl)}" alt="" style="width:32px;height:32px;border-radius:9px;">`
    : `<div class="avatar-fallback" style="width:32px;height:32px;border-radius:9px;font-size:12px;">${escapeHtml(initials(bot?.name || 'DJ'))}</div>`;
  return `<header class="topbar">
  <a href="/" class="brand">
    ${logo}
    <div>
      <div class="brand-name">${escapeHtml(bot?.name || 'Music Bot')}</div>
      <div class="brand-sub">Dashboard</div>
    </div>
  </a>
  <a href="/logout" class="icon-link">${ICONS.logout} ออกจากระบบ</a>
</header>`;
}

function guildListPage({ guilds, bot }) {
  const items = guilds
    .map(
      (g) => `<a href="/guild/${g.id}" class="guild-row">
        ${avatar(g.name, g.iconUrl, 44)}
        <div class="meta">
          <div class="g-name">${escapeHtml(g.name)}</div>
          <div class="g-sub">${ICONS.people}${g.memberCount.toLocaleString()} สมาชิก ${g.playing ? '<span class="badge-live" style="margin-left:6px;"><span class="dot"></span>กำลังเล่น</span>' : ''}</div>
        </div>
        <span class="chevron">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>`,
    )
    .join('');
  return layout({
    title: 'เลือกเซิร์ฟเวอร์ - ' + (bot?.name || 'Music Bot'),
    body: `
${headerNav(bot)}
<main>
  <h1 class="page-title">เซิร์ฟเวอร์ของคุณ</h1>
  <p class="page-sub">เลือกเซิร์ฟเวอร์ที่ต้องการตั้งค่าบอท</p>
  <div class="guild-list">${items || '<div class="card"><div class="empty-state">บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ไหนเลย</div></div>'}</div>
</main>`,
  });
}

function commandCheckboxes(allCommands, disabled) {
  return allCommands
    .map((name) => {
      const checked = !disabled.includes(name);
      return `<label class="cmd-toggle">
        <span class="cmd-name">/${name}</span>
        <span class="switch">
          <input type="checkbox" name="enabled_commands" value="${name}" ${checked ? 'checked' : ''}>
          <span class="track"><span class="thumb"></span></span>
        </span>
      </label>`;
    })
    .join('');
}

function guildSettingsPage({ guild, settings, textChannels, roles, allCommands, saved, bot }) {
  const channelOptions = [`<option value="">(ห้องที่พิมพ์คำสั่ง /play)</option>`]
    .concat(
      textChannels.map(
        (c) => `<option value="${c.id}" ${settings.announce_channel_id === c.id ? 'selected' : ''}>#${escapeHtml(c.name)}</option>`,
      ),
    )
    .join('');

  const roleOptions = [`<option value="">(ทุกคนสั่งได้)</option>`]
    .concat(roles.map((r) => `<option value="${r.id}" ${settings.dj_role_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`))
    .join('');

  return layout({
    title: `${guild.name} - ${bot?.name || 'Music Bot'}`,
    body: `
${headerNav(bot)}
<main>
  <a href="/" class="icon-link" style="margin-bottom:12px; padding-left:0;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    เซิร์ฟเวอร์ทั้งหมด
  </a>
  <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
    ${avatar(guild.name, guild.iconUrl, 48)}
    <div>
      <h1 class="page-title" style="margin:0;">${escapeHtml(guild.name)}</h1>
      <p class="page-sub" style="margin:2px 0 0;">ตั้งค่าบอทเพลงสำหรับเซิร์ฟเวอร์นี้</p>
    </div>
  </div>

  <div class="card">
    <div class="section-head">
      <div class="section-icon">${ICONS.note}</div>
      <h2 class="section-title">สถานะตอนนี้</h2>
    </div>
    <div id="now-playing" style="margin-top:16px;"><div class="empty-state">กำลังโหลดสถานะ...</div></div>
  </div>

  <form method="POST" action="/guild/${guild.id}">
    <div class="card">
      <div class="section-head">
        <div class="section-icon">${ICONS.volume}</div>
        <h2 class="section-title">ระดับเสียงเริ่มต้น</h2>
      </div>
      <p class="section-desc">ใช้ตอนเริ่มเล่นเพลงใหม่ทุกครั้ง</p>
      <div class="field">
        <div class="volume-row">
          <input type="range" id="default_volume" name="default_volume" min="0" max="100" value="${settings.default_volume}"
            oninput="document.getElementById('vol-val').textContent = this.value + '%'">
          <span class="volume-value" id="vol-val">${settings.default_volume}%</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div class="section-icon">${ICONS.channel}</div>
        <h2 class="section-title">ห้องแจ้งเพลง</h2>
      </div>
      <p class="section-desc">ห้องข้อความที่บอทจะโพสต์ว่ากำลังเล่นอะไร</p>
      <div class="field">
        <select id="announce_channel_id" name="announce_channel_id">${channelOptions}</select>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div class="section-icon">${ICONS.shield}</div>
        <h2 class="section-title">จำกัดสิทธิ์คำสั่งควบคุมเพลง</h2>
      </div>
      <p class="section-desc">ใช้กับ /skip /stop /pause /resume /volume /loop /leave — แอดมินสั่งได้เสมอ</p>
      <div class="field">
        <select id="dj_role_id" name="dj_role_id">${roleOptions}</select>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div class="section-icon">${ICONS.toggle}</div>
        <h2 class="section-title">เปิด/ปิดคำสั่ง</h2>
      </div>
      <p class="section-desc">สลับปิดคำสั่งที่ไม่ต้องการให้ใช้ในเซิร์ฟเวอร์นี้</p>
      <div class="command-grid">${commandCheckboxes(allCommands, settings.disabled_commands)}</div>
    </div>

    <div style="display:flex; align-items:center;">
      <button type="submit" class="primary">บันทึกการตั้งค่า</button>
      ${saved ? '<span class="saved-toast">บันทึกแล้ว</span>' : ''}
    </div>
  </form>
</main>
<script>
async function refreshStatus() {
  try {
    const res = await fetch('/guild/${guild.id}/status.json');
    const data = await res.json();
    const el = document.getElementById('now-playing');
    if (!data.playing) {
      el.innerHTML = '<div class="empty-state">ตอนนี้ไม่มีเพลงเล่นอยู่</div>';
      return;
    }
    const rest = data.queue.slice(1);
    const queueHtml = rest.length
      ? '<ul class="np-queue">' + rest.map((s, i) => '<li><span class="idx">' + (i + 1) + '.</span>' + s + '</li>').join('') + '</ul>'
      : '';
    el.innerHTML =
      '<div class="np-card">' +
        '<div class="eq"><span></span><span></span><span></span></div>' +
        '<div>' +
          '<div class="np-title">' + data.nowPlaying + '</div>' +
          '<div class="np-sub">🔊 ' + data.voiceChannel + '</div>' +
        '</div>' +
      '</div>' +
      queueHtml;
  } catch (e) {
    // dashboard status polling failure is non-critical; keep last known state
  }
}
refreshStatus();
setInterval(refreshStatus, 5000);
</script>`,
  });
}

module.exports = { loginPage, guildListPage, guildSettingsPage };
