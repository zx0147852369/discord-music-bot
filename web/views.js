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
  server: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="7" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="13" width="18" height="7" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="7.5" r="1.1" fill="currentColor"/><circle cx="7" cy="16.5" r="1.1" fill="currentColor"/></svg>',
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

function layout({ title, body, nav }) {
  // The login screen is the only page without the app shell.
  const sidebarHtml = nav ? sidebar(nav) : '';
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${fontsAndReset()}
<style>
  :root {
    color-scheme: light;
    --bg: #f6f7f9;
    --surface: #ffffff;
    --surface-2: #f2f4f7;
    --surface-hover: #eceff3;
    --border: #e4e7ec;
    --border-strong: #d0d5dd;
    --text: #101828;
    --text-muted: #5a6473;
    --text-faint: #8a93a3;
    --accent: #3352cc;
    --accent-hover: #2942ab;
    --accent-soft: #e8ecfb;
    --success: #067647;
    --success-soft: #e4f6ec;
    --danger: #b42318;
    --danger-soft: #fdeceb;
    --warning: #b54708;
    --warning-soft: #fdf1e3;
    --radius: 10px;
    --shadow: 0 1px 2px rgba(16,24,40,0.05);
    --shadow-lift: 0 4px 12px rgba(16,24,40,0.08);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    font-family: 'Inter', 'Noto Sans Thai', -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }
  a { color: inherit; }
  ::selection { background: var(--accent-soft); }

  /* App shell: fixed menu on the left, content beside it. */
  .shell { display: flex; min-height: 100vh; }
  .sidebar {
    width: 250px; flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 20px 14px;
    display: flex; flex-direction: column; gap: 6px;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }
  .nav { display: flex; flex-direction: column; gap: 2px; margin-top: 18px; }
  .nav-group {
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
    color: var(--text-faint); padding: 16px 10px 6px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px;
    color: var(--text-muted); text-decoration: none;
    font-size: 14px; font-weight: 500;
    transition: background .15s ease, color .15s ease;
  }
  .nav-item svg { width: 17px; height: 17px; flex-shrink: 0; }
  .nav-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .nav-foot { margin-top: auto; }

  .brand { display: flex; align-items: center; gap: 11px; text-decoration: none; padding: 4px 6px; }
  .brand-name { font-weight: 700; font-size: 15px; letter-spacing: .1px; }
  .brand-sub { font-size: 12px; color: var(--text-faint); font-weight: 500; }
  .icon-link {
    display: inline-flex; align-items: center; gap: 7px;
    color: var(--text-muted); text-decoration: none; font-size: 13.5px; font-weight: 600;
    padding: 8px 12px; border-radius: 9px; transition: all .15s ease;
  }
  .icon-link:hover { color: var(--text); background: var(--surface-2); }
  .icon-link svg { width: 16px; height: 16px; }

  .content { flex: 1; min-width: 0; padding: 34px 32px 64px; }
  main { max-width: 760px; margin: 0 auto; }
  main.narrow { max-width: 420px; }

  /* Settings beside a history rail: the rail drops under the settings on narrow screens. */
  .split { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; max-width: 1180px; margin: 0 auto; }
  .split > main { max-width: none; margin: 0; }
  .rail { position: sticky; top: 34px; display: flex; flex-direction: column; gap: 16px; }
  .rail .card { margin-bottom: 0; padding: 20px; }
  .rail-list { display: flex; flex-direction: column; margin-top: 12px; }
  .rail-item {
    display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: baseline;
    padding: 9px 0; border-top: 1px solid var(--border);
  }
  .rail-item:first-child { border-top: none; padding-top: 4px; }
  .rail-title {
    font-size: 13.5px; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rail-title a { color: var(--text); text-decoration: none; }
  .rail-title a:hover { color: var(--accent); text-decoration: underline; }
  .rail-meta { font-size: 11.5px; color: var(--text-faint); white-space: nowrap; }
  .rail-foot { margin-top: 14px; font-size: 13px; }
  .rail-foot a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .rail-foot a:hover { text-decoration: underline; }

  .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -.2px; }
  .page-sub { color: var(--text-muted); font-size: 14px; margin: 0 0 28px; }

  .card {
    background: var(--surface);
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
    border: 3px solid var(--surface);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(16,24,40,0.2);
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
    box-shadow: var(--shadow);
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
  .tbtn.danger { color: var(--danger); border-color: #f3c3bf; }
  .tbtn.danger:hover:not(:disabled) { background: var(--danger-soft); }
  .toast {
    margin-top: 14px; font-size: 13px; padding: 10px 14px; border-radius: 9px; display: none;
  }
  .toast.ok { display: block; background: var(--success-soft); color: var(--success); }
  .toast.err { display: block; background: var(--danger-soft); color: var(--danger); }

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
  .log-table tr:hover td { background: var(--surface-2); }
  .log-time { color: var(--text-faint); white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 12.5px; }
  .log-actor { color: var(--text-muted); white-space: nowrap; }
  .log-detail { color: var(--text); word-break: break-word; }
  .lvl {
    display: inline-block; padding: 3px 9px; border-radius: 6px;
    font-size: 12px; font-weight: 600; white-space: nowrap;
  }
  .lvl.info { background: var(--accent-soft); color: var(--accent); }
  .lvl.warn { background: var(--warning-soft); color: var(--warning); }
  .lvl.error { background: var(--danger-soft); color: var(--danger); }
  .table-scroll { overflow-x: auto; }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 18px 20px; box-shadow: var(--shadow);
  }
  .stat-num { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
  .stat-sub { font-size: 11.5px; color: var(--text-faint); margin-top: 6px; font-variant-numeric: tabular-nums; }

  .meter {
    height: 8px; border-radius: 999px; background: var(--surface-2);
    overflow: hidden; margin-top: 10px;
  }
  .meter-fill { display: block; height: 100%; border-radius: 999px; background: var(--accent); transition: width .4s ease; }
  .meter-fill.warn { background: var(--warning); }
  .meter-fill.crit { background: var(--danger); }
  .meter-row { padding: 16px 0; border-top: 1px solid var(--border); }
  .meter-row:first-of-type { border-top: none; }
  .meter-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .meter-name { font-size: 13.5px; font-weight: 600; }
  .meter-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .meter-note { font-size: 12px; color: var(--text-faint); margin-top: 4px; }

  .kv { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 4px 16px; font-size: 13.5px; margin-top: 16px; }
  .kv dt { color: var(--text-muted); padding: 7px 0; }
  .kv dd { margin: 0; padding: 7px 0; word-break: break-word; font-variant-numeric: tabular-nums; }
  @media (max-width: 560px) { .kv { grid-template-columns: minmax(0, 1fr); } .kv dt { padding-bottom: 0; } }

  .top-list { margin-top: 14px; }
  .top-row {
    display: grid; grid-template-columns: 26px 1fr auto; gap: 12px; align-items: center;
    padding: 10px 0; border-top: 1px solid var(--border); font-size: 14px;
  }
  .top-row:first-child { border-top: none; }
  .top-rank {
    font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 600;
    color: var(--text-faint); text-align: right;
  }
  .top-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .top-title a { color: var(--text); text-decoration: none; }
  .top-title a:hover { color: var(--accent); text-decoration: underline; }
  .top-plays { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
  .log-detail a { color: var(--text); text-decoration: none; }
  .log-detail a:hover { color: var(--accent); text-decoration: underline; }

  .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
  .tab {
    padding: 8px 16px; border-radius: 9px 9px 0 0; font-size: 13.5px; font-weight: 600;
    color: var(--text-muted); text-decoration: none; border-bottom: 2px solid transparent;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }

  .console {
    background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px;
    padding: 14px; max-height: 65vh; overflow: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: 12.5px; line-height: 1.65;
  }
  .cline { display: flex; gap: 10px; padding: 2px 0; }
  .cline .ct { color: var(--text-faint); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .cline .cx { white-space: pre-wrap; word-break: break-word; flex: 1; }
  .cline.warn .cx { color: var(--warning); }
  .cline.error .cx { color: var(--danger); }
  .cline.info .cx { color: var(--text); }

  .login-card { max-width: 380px; margin: 12vh auto 0; text-align: center; }
  .login-logo { margin: 0 auto 18px; }
  .login-title { font-size: 20px; font-weight: 800; margin: 0 0 6px; }
  .login-sub { font-size: 13.5px; color: var(--text-muted); margin: 0 0 26px; }
  .login-card form { text-align: left; }
  .error-box {
    background: var(--danger-soft); color: var(--danger);
    border: 1px solid #f3c3bf;
    padding: 10px 14px; border-radius: 9px;
    font-size: 13px; margin-top: 16px;
  }
  button.primary.full { width: 100%; }

  @media (max-width: 1100px) {
    .split { grid-template-columns: minmax(0, 1fr); }
    .rail { position: static; }
  }
  @media (max-width: 820px) {
    .shell { flex-direction: column; }
    .sidebar {
      width: auto; height: auto; position: static;
      border-right: none; border-bottom: 1px solid var(--border);
      flex-direction: row; align-items: center; flex-wrap: wrap; gap: 4px;
      padding: 12px 16px;
    }
    .nav { flex-direction: row; flex-wrap: wrap; margin-top: 0; margin-left: auto; }
    .nav-group { display: none; }
    .nav-foot { margin-top: 0; }
    .content { padding: 24px 16px 48px; }
  }
  @media (max-width: 560px) {
    .card { padding: 18px; }
    .command-grid { grid-template-columns: 1fr 1fr; }
    .nav-item span { display: none; }
    .nav-item { padding: 9px; }
  }
</style>
</head>
<body>
<div class="shell">
${sidebarHtml}
<div class="content">
${body}
</div>
</div>
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

function formatDuration(seconds) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function historyPage({ guild, history, top, stats, autoplay, bot }) {
  const rows = history
    .map(
      (h) => `<tr>
        <td class="log-time">${escapeHtml(formatTime(h.played_at))}</td>
        <td class="log-detail">${
          h.url ? `<a href="${escapeHtml(h.url)}" target="_blank" rel="noopener">${escapeHtml(h.title)}</a>` : escapeHtml(h.title)
        }</td>
        <td class="log-actor">${escapeHtml(formatDuration(h.duration))}</td>
        <td class="log-actor">${h.auto ? '<span class="lvl info">อัตโนมัติ</span>' : escapeHtml(h.requested_by || '—')}</td>
      </tr>`,
    )
    .join('');

  const topRows = top
    .map(
      (t, i) => `<div class="top-row">
        <span class="top-rank">${i + 1}</span>
        <span class="top-title">${
          t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(t.title)}</a>` : escapeHtml(t.title)
        }</span>
        <span class="top-plays">${t.plays} ครั้ง</span>
      </div>`,
    )
    .join('');

  return layout({
    title: `ประวัติเพลง ${guild.name} - ${bot?.name || 'Music Bot'}`,
    nav: { bot, active: 'history', guild },
    body: `
<main style="max-width:960px;">
  <h1 class="page-title">ประวัติเพลงของ ${escapeHtml(guild.name)}</h1>
  <p class="page-sub">
    บอทใช้ประวัตินี้เลือกเพลงแนวเดียวกันมาเล่นต่อเมื่อคิวหมด
    — ตอนนี้ระบบเล่นต่อเนื่อง<b>${autoplay ? 'เปิดอยู่' : 'ปิดอยู่'}</b>
  </p>

  <div class="stat-grid">
    <div class="stat"><div class="stat-num">${stats.total || 0}</div><div class="stat-label">เพลงที่เล่นทั้งหมด</div></div>
    <div class="stat"><div class="stat-num">${stats.unique_songs || 0}</div><div class="stat-label">เพลงที่ไม่ซ้ำกัน</div></div>
    <div class="stat"><div class="stat-num">${stats.auto_plays || 0}</div><div class="stat-label">เล่นต่อเนื่องอัตโนมัติ</div></div>
  </div>

  ${
    topRows
      ? `<div class="card">
          <div class="section-head">
            <div class="section-icon">${ICONS.note}</div>
            <h2 class="section-title">เพลงที่เปิดบ่อยที่สุด</h2>
          </div>
          <div class="top-list">${topRows}</div>
        </div>`
      : ''
  }

  <div class="card">
    <div class="section-head">
      <div class="section-icon">${ICONS.log}</div>
      <h2 class="section-title">เล่นล่าสุด</h2>
    </div>
    <div style="margin-top:16px;">
    ${
      rows
        ? `<div class="table-scroll"><table class="log-table">
             <thead><tr><th>เวลา</th><th>เพลง</th><th>ความยาว</th><th>ขอโดย</th></tr></thead>
             <tbody>${rows}</tbody>
           </table></div>`
        : '<div class="empty-state">ยังไม่มีประวัติ — ลองสั่งเพลงสักเพลงก่อน</div>'
    }
    </div>
  </div>
  <p class="muted" style="text-align:center; font-size:12.5px;">แสดงล่าสุด 200 เพลง · เก็บสะสมสูงสุด 5,000 เพลง</p>
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

function consoleLogsPage({ lines, level, bot, guild }) {
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
    nav: { bot, active: 'console', guild },
    body: `
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

function logsPage({ events, level, bot, scope, basePath, tab, guild, active }) {

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
    nav: { bot, active, guild },
    body: `
<main style="max-width:960px;">
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

/**
 * Left navigation shared by every page. Server-specific entries only appear once a server
 * is selected, so the menu never offers links that would 404.
 */
function sidebar({ bot, active, guild }) {
  const logo = bot?.avatarUrl
    ? `<img src="${escapeHtml(bot.avatarUrl)}" alt="" style="width:34px;height:34px;border-radius:9px;">`
    : `<div class="avatar-fallback" style="width:34px;height:34px;border-radius:9px;font-size:13px;">${escapeHtml(initials(bot?.name || 'DJ'))}</div>`;

  const item = (key, href, icon, label) =>
    `<a href="${href}" class="nav-item${active === key ? ' active' : ''}">${icon}<span>${label}</span></a>`;

  return `<aside class="sidebar">
  <a href="/" class="brand">
    ${logo}
    <div>
      <div class="brand-name">${escapeHtml(bot?.name || 'Music Bot')}</div>
      <div class="brand-sub">Dashboard</div>
    </div>
  </a>

  <nav class="nav">
    ${item('servers', '/', ICONS.people, 'เซิร์ฟเวอร์ทั้งหมด')}
    ${
      guild
        ? `<div class="nav-group">${escapeHtml(guild.name)}</div>
           ${item('settings', `/guild/${guild.id}`, ICONS.toggle, 'ตั้งค่าบอท')}
           ${item('history', `/guild/${guild.id}/history`, ICONS.note, 'ประวัติการเล่นเพลง')}
           ${item('guildlogs', `/guild/${guild.id}/logs`, ICONS.log, 'บันทึกของเซิร์ฟเวอร์')}`
        : ''
    }
    <div class="nav-group">ระบบ</div>
    ${item('logs', '/logs', ICONS.log, 'บันทึกระบบ')}
    ${item('console', '/logs/console', ICONS.search, 'บันทึกบอท')}
    ${item('system', '/system', ICONS.server, 'ทรัพยากรเครื่อง')}
  </nav>

  <a href="/logout" class="nav-item nav-foot">${ICONS.logout}<span>ออกจากระบบ</span></a>
</aside>`;
}

function guildListPage({ guilds, bot, guild }) {
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
    nav: { bot, active: 'servers', guild },
    body: `
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

function historyRail(guild, recent) {
  const items = recent
    .map(
      (h) => `<div class="rail-item">
        <span class="rail-title">${
          h.url ? `<a href="${escapeHtml(h.url)}" target="_blank" rel="noopener">${escapeHtml(h.title)}</a>` : escapeHtml(h.title)
        }</span>
        <span class="rail-meta">${h.auto ? 'อัตโนมัติ' : escapeHtml(h.requested_by || '—')}</span>
      </div>`,
    )
    .join('');

  return `<aside class="rail">
  <div class="card">
    <div class="section-head">
      <div class="section-icon">${ICONS.note}</div>
      <h2 class="section-title">ประวัติการเล่นเพลง</h2>
    </div>
    ${items ? `<div class="rail-list">${items}</div>` : '<div class="empty-state">ยังไม่มีเพลงที่เคยเล่น</div>'}
    <div class="rail-foot"><a href="/guild/${guild.id}/history">ดูประวัติทั้งหมด →</a></div>
  </div>
</aside>`;
}

function guildSettingsPage({ guild, settings, textChannels, roles, voiceChannels, allCommands, saved, bot, recentHistory = [] }) {
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
    nav: { bot, active: 'settings', guild },
    body: `
<div class="split">
<main>
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
        <div class="section-icon">${ICONS.note}</div>
        <h2 class="section-title">เล่นเพลงต่อเนื่องอัตโนมัติ</h2>
      </div>
      <p class="section-desc">เมื่อเล่นครบคิว บอทจะหาเพลงแนวเดียวกับเพลงล่าสุดมาเล่นต่อเอง โดยดูจากประวัติของเซิร์ฟเวอร์นี้</p>
      <label class="cmd-toggle" style="margin-top:14px; max-width:280px;">
        <span class="cmd-name" style="font-family:inherit;">เล่นต่อเนื่องไม่มีสะดุด</span>
        <span class="switch">
          <input type="checkbox" name="autoplay" ${settings.autoplay ? 'checked' : ''}>
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
</main>
${historyRail(guild, recentHistory)}
</div>
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


function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days} วัน ${hours} ชม.`;
  if (hours) return `${hours} ชม. ${minutes} นาที`;
  if (minutes) return `${minutes} นาที`;
  return `${total} วินาที`;
}

/**
 * Every live number on the resource page, keyed by the element that shows it.
 *
 * The page renders from this and the refresh endpoint returns it, so each reading is
 * formatted in exactly one place and the browser only has to copy strings into the DOM.
 */
function systemFields(stats) {
  const { cpu, memory, disk, storage, uptime, bot } = stats;
  const allowance = stats.host.cpuAllowance;

  return {
    'cpu-bot': {
      text: `${cpu.botPercent.toFixed(1)}%`,
      percent: cpu.botPercent,
      sub: `${cpu.botCorePercent.toFixed(0)}% ของ 1 คอร์ · โควตา ${allowance ? allowance.toFixed(1) : stats.host.cores} คอร์`,
    },
    'cpu-sys': {
      text: `${cpu.systemPercent.toFixed(1)}%`,
      percent: cpu.systemPercent,
      sub: cpu.loadAvg == null ? `${stats.host.cores} คอร์` : `load avg ${cpu.loadAvg.toFixed(2)} · ${stats.host.cores} คอร์`,
    },
    mem: {
      text: `${memory.percent.toFixed(1)}%`,
      percent: memory.percent,
      sub: `${formatBytes(memory.used)} / ${formatBytes(memory.total)}`,
    },
    'mem-bot': {
      text: formatBytes(memory.rss),
      percent: memory.total ? (memory.rss / memory.total) * 100 : 0,
      sub: `heap ${formatBytes(memory.heapUsed)} จาก ${formatBytes(memory.heapTotal)}`,
    },
    disk: disk
      ? {
          text: `${disk.percent.toFixed(1)}%`,
          percent: disk.percent,
          sub: `${formatBytes(disk.used)} / ${formatBytes(disk.total)} · เหลือ ${formatBytes(disk.free)}`,
        }
      : { text: '—', percent: 0, sub: 'อ่านค่าพื้นที่ดิสก์ไม่ได้' },
    uptime: { text: formatUptime(uptime.process), sub: `เครื่องเปิดมา ${formatUptime(uptime.system)}` },
    'db-size': {
      text: formatBytes(storage.dbBytes),
      sub: storage.persistent ? 'เก็บบน Volume ถาวร' : 'ยังไม่ได้อยู่บน Volume — ข้อมูลหายเมื่อ deploy ใหม่',
    },
    'bot-guilds': { text: String(bot?.guilds ?? '—'), sub: 'เซิร์ฟเวอร์ที่บอทอยู่' },
    'bot-playing': { text: String(bot?.playing ?? '—'), sub: 'ห้องที่กำลังเล่นเพลง' },
    'bot-voice': { text: String(bot?.voice ?? '—'), sub: 'การเชื่อมต่อห้องเสียง' },
    'bot-ping': { text: bot?.ping == null ? '—' : `${bot.ping} ms`, sub: 'ความหน่วงถึง Discord' },
  };
}

function systemPage({ stats, bot, guild }) {
  const fields = systemFields(stats);
  const tone = (percent) => (percent >= 90 ? ' crit' : percent >= 75 ? ' warn' : '');

  const statCard = (id, label) => `<div class="stat">
      <div class="stat-num" data-f="${id}">${escapeHtml(fields[id].text)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-sub" data-s="${id}">${escapeHtml(fields[id].sub || '')}</div>
    </div>`;

  const meterRow = (id, name) => {
    const f = fields[id];
    const width = Math.min(100, Math.max(0, f.percent || 0)).toFixed(1);
    return `<div class="meter-row">
      <div class="meter-head">
        <span class="meter-name">${escapeHtml(name)}</span>
        <span class="meter-value" data-f="${id}">${escapeHtml(f.text)}</span>
      </div>
      <div class="meter"><span class="meter-fill${tone(f.percent)}" data-m="${id}" style="width:${width}%"></span></div>
      <div class="meter-note" data-s="${id}">${escapeHtml(f.sub || '')}</div>
    </div>`;
  };

  const host = stats.host;
  const rows = [
    ['ชื่อเครื่อง', host.hostname],
    ['ระบบปฏิบัติการ', `${host.os} (${host.arch})`],
    ['ซีพียู', `${host.cpuModel} · ${host.cores} คอร์`],
    ['โควตาซีพียู', host.cpuAllowance ? `${host.cpuAllowance.toFixed(2)} คอร์` : 'ไม่จำกัด (ใช้ได้ทั้งเครื่อง)'],
    ['แรมที่ใช้ได้', `${formatBytes(stats.memory.total)} (${host.containerised ? 'โควตาของคอนเทนเนอร์' : 'ทั้งเครื่อง'})`],
    ['Node.js', host.node],
    ['บริการ', host.service || '—'],
    ['สภาพแวดล้อม', host.environment || '—'],
    ['โซนที่รัน', host.region || '—'],
    ['คอมมิตที่ deploy', host.commit || '—'],
    ['ไฟล์ฐานข้อมูล', stats.storage.dbPath],
  ]
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
    .join('');

  return layout({
    title: `ทรัพยากรเครื่อง - ${bot?.name || 'Music Bot'}`,
    nav: { bot, active: 'system', guild },
    body: `
<main style="max-width:960px;">
  <h1 class="page-title">ทรัพยากรเครื่อง</h1>
  <p class="page-sub">เครื่องที่บอทรันอยู่ตอนนี้ใช้ CPU แรม และพื้นที่ดิสก์ไปเท่าไหร่ · อัปเดตอัตโนมัติทุก 5 วินาที</p>

  <div class="stat-grid">
    ${statCard('cpu-bot', 'CPU ที่บอทใช้')}
    ${statCard('mem', 'แรมที่ใช้')}
    ${statCard('disk', 'ดิสก์ที่ใช้')}
    ${statCard('uptime', 'บอททำงานต่อเนื่อง')}
  </div>

  <div class="card">
    <div class="section-head">
      <span class="section-icon">${ICONS.server}</span>
      <h2 class="section-title">การใช้ทรัพยากร</h2>
    </div>
    <p class="section-desc">แถบจะเป็นสีส้มเมื่อเกิน 75% และสีแดงเมื่อเกิน 90%</p>
    ${meterRow('cpu-bot', 'CPU ของบอท')}
    ${meterRow('cpu-sys', 'CPU ของทั้งเครื่อง')}
    ${meterRow('mem', 'แรมของทั้งเครื่อง')}
    ${meterRow('mem-bot', 'แรมที่โปรเซสบอทใช้')}
    ${meterRow('disk', 'พื้นที่ดิสก์')}
  </div>

  <div class="card">
    <div class="section-head">
      <span class="section-icon">${ICONS.people}</span>
      <h2 class="section-title">งานที่บอทแบกอยู่</h2>
    </div>
    <p class="section-desc">ยิ่งเล่นพร้อมกันหลายห้อง ยิ่งใช้ CPU และแรมมากขึ้น</p>
    <div class="stat-grid" style="margin: 18px 0 0;">
      ${statCard('bot-guilds', 'เซิร์ฟเวอร์')}
      ${statCard('bot-playing', 'กำลังเล่น')}
      ${statCard('bot-voice', 'ห้องเสียง')}
      ${statCard('bot-ping', 'Ping')}
    </div>
  </div>

  <div class="card">
    <div class="section-head">
      <span class="section-icon">${ICONS.log}</span>
      <h2 class="section-title">ข้อมูลเครื่องและฐานข้อมูล</h2>
    </div>
    <p class="section-desc">ขนาดฐานข้อมูลตอนนี้ <b data-f="db-size">${escapeHtml(fields['db-size'].text)}</b> — <span data-s="db-size">${escapeHtml(fields['db-size'].sub)}</span></p>
    <dl class="kv">${rows}</dl>
  </div>
</main>
<script>
function toneClass(p) { return p >= 90 ? ' crit' : p >= 75 ? ' warn' : ''; }
async function refreshSystem() {
  try {
    const res = await fetch('/system.json');
    const { fields } = await res.json();
    for (const [id, f] of Object.entries(fields)) {
      document.querySelectorAll('[data-f="' + id + '"]').forEach((el) => { el.textContent = f.text; });
      document.querySelectorAll('[data-s="' + id + '"]').forEach((el) => { el.textContent = f.sub || ''; });
      document.querySelectorAll('[data-m="' + id + '"]').forEach((el) => {
        const p = Math.min(100, Math.max(0, f.percent || 0));
        el.style.width = p.toFixed(1) + '%';
        el.className = 'meter-fill' + toneClass(p);
      });
    }
  } catch (e) {
    // a dropped poll just leaves the previous numbers on screen until the next tick
  }
}
setInterval(refreshSystem, 5000);
</script>`,
  });
}

module.exports = {
  loginPage,
  guildListPage,
  guildSettingsPage,
  logsPage,
  consoleLogsPage,
  historyPage,
  systemPage,
  systemFields,
};
