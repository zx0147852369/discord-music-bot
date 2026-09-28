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
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>',
  skip: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 5.5v13L15 12 6 5.5Z" fill="currentColor"/><rect x="16.5" y="5.5" width="2.8" height="13" rx="1.2" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.5 3.7V8h4.3M9 12.5h6M9 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

// Human-readable labels for the event types written by the bot and dashboard.
const EVENT_LABELS = {
  now_playing: 'กำลังเล่น',
  queued: 'เพิ่มเข้าคิว',
  queue_finished: 'เล่นจบคิว',
  voice_left: 'ออกจากห้องเสียง',
  playback_error: 'เล่นเพลงผิดพลาด',
  command: 'ใช้คำสั่ง',
  command_blocked: 'คำสั่งถูกปฏิเสธ',
  command_error: 'คำสั่งผิดพลาด',
  dashboard_play: 'สั่งเล่นจากเว็บ',
  dashboard_play_failed: 'สั่งเล่นจากเว็บไม่สำเร็จ',
  dashboard_control: 'ควบคุมจากเว็บ',
  settings_saved: 'บันทึกการตั้งค่า',
  login_ok: 'เข้าสู่ระบบสำเร็จ',
  login_failed: 'รหัสผ่านผิด',
  login_locked: 'ถูกล็อกชั่วคราว',
  bot_started: 'บอทเริ่มทำงาน',
};

function formatTime(ms) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(ms));
}

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
  /* The visible track stays slim, but the input itself is tall enough to grab: a 6px-high
     input is nearly impossible to hit with a mouse. */
  input[type=range] {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 26px;
    background: transparent;
    outline: none;
    cursor: pointer;
    margin: 0;
  }
  input[type=range]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  input[type=range]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  input[type=range]:focus-visible::-webkit-slider-runnable-track { outline: 2px solid var(--accent); outline-offset: 3px; }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--accent);
    border: 3px solid #fff2;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(88,101,242,0.5);
    margin-top: -6px; /* centre the thumb on the 6px track */
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

  .player-row { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
  .player-row input[type=text] { flex: 1 1 240px; }
  .player-row select { flex: 0 1 200px; }
  .player-row button { margin-top: 0; flex-shrink: 0; }
  .transport { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; align-items: center; }
  .tbtn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--surface-2); color: var(--text);
    border: 1px solid var(--border-strong); border-radius: 10px;
    padding: 9px 14px; font-size: 13.5px; font-weight: 600; font-family: inherit;
    cursor: pointer; margin-top: 0; box-shadow: none;
    transition: background .15s ease, border-color .15s ease, opacity .15s ease;
  }
  .tbtn:hover:not(:disabled) { background: var(--surface-hover); }
  .tbtn:disabled { opacity: .4; cursor: not-allowed; }
  .tbtn svg { width: 15px; height: 15px; }
  .tbtn.danger { color: #ff8789; border-color: rgba(242,63,66,0.35); }
  .tbtn.danger:hover:not(:disabled) { background: var(--danger-soft); }
  .toast {
    margin-top: 14px; font-size: 13px; padding: 10px 14px; border-radius: 9px; display: none;
  }
  .toast.ok { display: block; background: var(--success-soft); color: var(--success); }
  .toast.err { display: block; background: var(--danger-soft); color: #ff8789; }

  .filters { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .chip {
    padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
    background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
    text-decoration: none; transition: all .15s ease;
  }
  .chip:hover { color: var(--text); border-color: var(--border-strong); }
  .chip.active { background: var(--accent-soft); border-color: var(--accent); color: var(--text); }

  .log-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .log-table th {
    text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .5px;
    color: var(--text-faint); font-weight: 600; padding: 0 12px 10px; white-space: nowrap;
  }
  .log-table td { padding: 11px 12px; border-top: 1px solid var(--border); vertical-align: top; }
  .log-table tr:hover td { background: rgba(255,255,255,0.02); }
  .log-time { color: var(--text-faint); white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 12.5px; }
  .log-actor { color: var(--text-muted); white-space: nowrap; }
  .log-detail { color: var(--text); word-break: break-word; }
  .lvl {
    display: inline-block; padding: 3px 9px; border-radius: 6px;
    font-size: 12px; font-weight: 600; white-space: nowrap;
  }
  .lvl.info { background: var(--accent-soft); color: #9aa4f8; }
  .lvl.warn { background: rgba(240,178,50,0.15); color: #f0b232; }
  .lvl.error { background: var(--danger-soft); color: #ff8789; }
  .table-scroll { overflow-x: auto; }

  .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
  .tab {
    padding: 8px 16px; border-radius: 9px 9px 0 0; font-size: 13.5px; font-weight: 600;
    color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }

  .console {
    background: #0a0b0e; border: 1px solid var(--border); border-radius: 10px;
    padding: 14px; max-height: 65vh; overflow: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: 12.5px; line-height: 1.65;
  }
  .cline { display: flex; gap: 10px; padding: 2px 0; }
  .cline .ct { color: var(--text-faint); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .cline .cx { white-space: pre-wrap; word-break: break-word; flex: 1; }
  .cline.warn .cx { color: #f0b232; }
  .cline.error .cx { color: #ff8789; }
  .cline.info .cx { color: #c9ccd4; }

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

function logTabs(active) {
  return `<div class="tabs">
    <a class="tab${active === 'events' ? ' active' : ''}" href="/logs">เหตุการณ์ระบบ</a>
    <a class="tab${active === 'console' ? ' active' : ''}" href="/logs/console">บันทึกบอท (console)</a>
  </div>`;
}

function levelChips(basePath, level) {
  const chip = (value, label) =>
    `<a class="chip${level === value ? ' active' : ''}" href="${basePath}${value ? `?level=${value}` : ''}">${label}</a>`;
  return `<div class="filters">${chip('', 'ทั้งหมด')}${chip('info', 'ปกติ')}${chip('warn', 'คำเตือน')}${chip('error', 'ข้อผิดพลาด')}</div>`;
}

function consoleLogsPage({ lines, level, bot }) {
  const rows = lines
    .map(
      (l) => `<div class="cline ${l.level}">
        <span class="ct">${escapeHtml(formatTime(l.at).split(' ').slice(-1)[0])}</span>
        <span class="cx">${escapeHtml(l.text)}</span>
      </div>`,
    )
    .join('');

  return layout({
    title: `บันทึกบอท - ${bot?.name || 'Music Bot'}`,
    body: `
${headerNav(bot)}
<main style="max-width:960px;">
  <h1 class="page-title">บันทึกบอท</h1>
  <p class="page-sub">ข้อความที่บอทพิมพ์ออกมาขณะทำงาน (ใหม่สุดอยู่บนสุด)</p>
  ${logTabs('console')}
  ${levelChips('/logs/console', level)}
  <div class="card">
    ${rows ? `<div class="console" id="console-box">${rows}</div>` : '<div class="empty-state">ยังไม่มีข้อความในหมวดนี้</div>'}
  </div>
  <p class="muted" style="text-align:center; font-size:12.5px;">
    เก็บในหน่วยความจำ 500 บรรทัดล่าสุด · รีเซ็ตเมื่อบอทรีสตาร์ท · อัปเดตอัตโนมัติทุก 5 วินาที
  </p>
</main>
<script>
const LEVEL = ${JSON.stringify(level || '')};
async function refreshConsole() {
  try {
    const res = await fetch('/logs/console.json' + (LEVEL ? '?level=' + LEVEL : ''));
    const { lines } = await res.json();
    const box = document.getElementById('console-box');
    if (!box) return;
    box.innerHTML = lines.map((l) => {
      const d = document.createElement('div');
      d.textContent = l.text;
      const t = new Date(l.at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
      return '<div class="cline ' + l.level + '"><span class="ct">' + t + '</span><span class="cx">' + d.innerHTML + '</span></div>';
    }).join('');
  } catch (e) {
    // transient fetch failures are not worth surfacing on a log viewer
  }
}
setInterval(refreshConsole, 5000);
</script>`,
  });
}

function logsPage({ events, level, bot, scope, basePath, tab }) {

  const rows = events
    .map(
      (e) => `<tr>
        <td class="log-time">${escapeHtml(formatTime(e.created_at))}</td>
        <td><span class="lvl ${e.level}">${escapeHtml(EVENT_LABELS[e.type] || e.type)}</span></td>
        <td class="log-actor">${escapeHtml(e.actor || '—')}</td>
        <td class="log-detail">${escapeHtml(e.detail || '')}</td>
      </tr>`,
    )
    .join('');

  return layout({
    title: `${scope.title} - ${bot?.name || 'Music Bot'}`,
    body: `
${headerNav(bot)}
<main style="max-width:960px;">
  ${
    scope.backTo
      ? `<a href="${scope.backTo}" class="icon-link" style="margin-bottom:12px; padding-left:0;">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           กลับไปหน้าตั้งค่า
         </a>`
      : ''
  }
  <h1 class="page-title">${escapeHtml(scope.title)}</h1>
  <p class="page-sub">${escapeHtml(scope.subtitle)}</p>
  ${tab ? logTabs(tab) : ''}
  ${levelChips(basePath, level)}

  <div class="card">
    ${
      rows
        ? `<div class="table-scroll"><table class="log-table">
             <thead><tr><th>เวลา</th><th>เหตุการณ์</th><th>โดย</th><th>รายละเอียด</th></tr></thead>
             <tbody>${rows}</tbody>
           </table></div>`
        : '<div class="empty-state">ยังไม่มีบันทึกในหมวดนี้</div>'
    }
  </div>
  <p class="muted" style="text-align:center; font-size:12.5px;">แสดงล่าสุดไม่เกิน 300 รายการ · เก็บสะสมสูงสุด 5,000 รายการ</p>
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
  <div style="display:flex; gap:4px;">
    <a href="/logs" class="icon-link">${ICONS.log} บันทึกระบบ</a>
    <a href="/logout" class="icon-link">${ICONS.logout} ออกจากระบบ</a>
  </div>
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

function guildSettingsPage({ guild, settings, textChannels, roles, voiceChannels, allCommands, saved, bot }) {
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
    <div class="transport">
      <button type="button" class="tbtn" id="btn-playpause" disabled>${ICONS.pause}<span id="playpause-label">หยุดชั่วคราว</span></button>
      <button type="button" class="tbtn" id="btn-skip" disabled>${ICONS.skip}ข้ามเพลง</button>
      <button type="button" class="tbtn danger" id="btn-stop" disabled>${ICONS.stop}หยุดเล่น</button>
    </div>
  </div>

  <div class="card">
    <div class="section-head">
      <div class="section-icon">${ICONS.search}</div>
      <h2 class="section-title">เปิดเพลง</h2>
    </div>
    <p class="section-desc">พิมพ์ชื่อเพลงหรือวางลิงก์ แล้วบอทจะเข้าห้องเสียงและเล่นให้ทันที</p>
    <div class="player-row">
      <select id="voice-channel" aria-label="ห้องเสียง">
        ${voiceChannels.length
          ? voiceChannels
              .map((c) => `<option value="${c.id}">🔊 ${escapeHtml(c.name)}${c.members ? ` (${c.members} คน)` : ''}</option>`)
              .join('')
          : '<option value="">(ไม่มีห้องเสียง)</option>'}
      </select>
      <input type="text" id="play-query" placeholder="เช่น bodyslam ความเชื่อ" autocomplete="off">
      <button type="button" class="primary" id="btn-play">เล่น</button>
    </div>
    <div class="toast" id="play-toast"></div>
  </div>

  <form method="POST" action="/guild/${guild.id}">
    <div class="card">
      <div class="section-head">
        <div class="section-icon">${ICONS.volume}</div>
        <h2 class="section-title">ระดับเสียงเริ่มต้น</h2>
      </div>
      <p class="section-desc">ใช้ตอนบอทเข้าห้องเสียงครั้งใหม่ — ถ้ามีเพลงเล่นอยู่ กดบันทึกแล้วจะปรับให้ทันที</p>
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
        <div class="section-icon">${ICONS.channel}</div>
        <h2 class="section-title">อยู่ในห้องเสียงตลอด (24/7)</h2>
      </div>
      <p class="section-desc">เล่นเพลงจบคิวหรือไม่มีคนในห้องแล้ว บอทจะยังอยู่ในห้องเดิม สั่งเพลงต่อได้ทันที (ใช้ /leave ถ้าต้องการให้ออก)</p>
      <label class="cmd-toggle" style="margin-top:14px; max-width:280px;">
        <span class="cmd-name" style="font-family:inherit;">อยู่ในห้องตลอดเวลา</span>
        <span class="switch">
          <input type="checkbox" name="stay_24_7" ${settings.stay_24_7 ? 'checked' : ''}>
          <span class="track"><span class="thumb"></span></span>
        </span>
      </label>
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

  <a href="/guild/${guild.id}/logs" class="guild-row" style="margin-top:20px;">
    <div class="section-icon">${ICONS.log}</div>
    <div class="meta">
      <div class="g-name">ดูบันทึกของเซิร์ฟเวอร์นี้</div>
      <div class="g-sub">ประวัติเพลงที่เล่น การใช้คำสั่ง และข้อผิดพลาด</div>
    </div>
    <span class="chevron">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>
  </a>
</main>
<script>
const GUILD = '${guild.id}';
const $ = (id) => document.getElementById(id);

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function toast(msg, ok) {
  const t = $('play-toast');
  t.textContent = msg;
  t.className = 'toast ' + (ok ? 'ok' : 'err');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.className = 'toast'; }, 5000);
}

async function post(path, body) {
  const res = await fetch('/guild/' + GUILD + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ทำรายการไม่สำเร็จ');
  return data;
}

async function refreshStatus() {
  try {
    const res = await fetch('/guild/' + GUILD + '/status.json');
    const data = await res.json();
    const el = $('now-playing');
    const playing = Boolean(data.playing);

    $('btn-skip').disabled = !playing;
    $('btn-stop').disabled = !playing;
    $('btn-playpause').disabled = !playing;
    $('playpause-label').textContent = data.paused ? 'เล่นต่อ' : 'หยุดชั่วคราว';

    if (!playing) {
      el.innerHTML = '<div class="empty-state">ตอนนี้ไม่มีเพลงเล่นอยู่</div>';
      return;
    }
    if (data.voiceChannelId) $('voice-channel').value = data.voiceChannelId;

    const rest = data.queue.slice(1);
    const queueHtml = rest.length
      ? '<ul class="np-queue">' + rest.map((s, i) => '<li><span class="idx">' + (i + 1) + '.</span>' + esc(s) + '</li>').join('') + '</ul>'
      : '';
    el.innerHTML =
      '<div class="np-card">' +
        '<div class="eq"><span></span><span></span><span></span></div>' +
        '<div>' +
          '<div class="np-title">' + esc(data.nowPlaying) + (data.paused ? ' (หยุดชั่วคราว)' : '') + '</div>' +
          '<div class="np-sub">🔊 ' + esc(data.voiceChannel) + ' · ระดับเสียง ' + data.volume + '%</div>' +
        '</div>' +
      '</div>' +
      queueHtml;
  } catch (e) {
    // dashboard status polling failure is non-critical; keep last known state
  }
}

async function play() {
  const query = $('play-query').value.trim();
  if (!query) return toast('กรุณาใส่ชื่อเพลงหรือลิงก์', false);
  const btn = $('btn-play');
  btn.disabled = true;
  btn.textContent = 'กำลังหา...';
  try {
    const data = await post('/play', { query, channelId: $('voice-channel').value });
    toast('เพิ่มเข้าคิวแล้ว: ' + data.title, true);
    $('play-query').value = '';
    refreshStatus();
  } catch (e) {
    toast(e.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'เล่น';
  }
}

async function control(action) {
  try {
    await post('/control', { action });
    refreshStatus();
  } catch (e) {
    toast(e.message, false);
  }
}

$('btn-play').addEventListener('click', play);
$('play-query').addEventListener('keydown', (e) => { if (e.key === 'Enter') play(); });
$('btn-playpause').addEventListener('click', () => {
  control($('playpause-label').textContent === 'เล่นต่อ' ? 'resume' : 'pause');
});
$('btn-skip').addEventListener('click', () => control('skip'));
$('btn-stop').addEventListener('click', () => control('stop'));

refreshStatus();
setInterval(refreshStatus, 5000);
</script>`,
  });
}

module.exports = { loginPage, guildListPage, guildSettingsPage, logsPage, consoleLogsPage };
