function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function layout({ title, body }) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", "Noto Sans Thai", Roboto, sans-serif;
    background: #1e1f22;
    color: #e3e5e8;
  }
  header {
    background: #2b2d31;
    padding: 16px 24px;
    border-bottom: 1px solid #3f4147;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header a { color: #e3e5e8; text-decoration: none; font-weight: 600; }
  main { max-width: 720px; margin: 32px auto; padding: 0 16px; }
  .card {
    background: #2b2d31;
    border: 1px solid #3f4147;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 16px;
  }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; margin-top: 0; }
  label { display: block; margin: 16px 0 6px; font-size: 14px; color: #b5bac1; }
  input[type=text], input[type=password], input[type=number], select {
    width: 100%;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #3f4147;
    background: #1e1f22;
    color: #e3e5e8;
    font-size: 14px;
  }
  .checkbox-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
  .checkbox-row input { width: auto; }
  button {
    background: #5865f2;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    margin-top: 20px;
  }
  button:hover { background: #4752c4; }
  .guild-list a {
    display: block;
    padding: 12px;
    background: #1e1f22;
    border-radius: 6px;
    margin-bottom: 8px;
    color: #e3e5e8;
    text-decoration: none;
  }
  .guild-list a:hover { background: #35373c; }
  .now-playing { font-size: 14px; }
  .now-playing .song { color: #5865f2; font-weight: 600; }
  .muted { color: #949ba4; font-size: 13px; }
  .saved-badge { color: #23a55a; font-size: 13px; margin-top: 8px; }
  .error { color: #f23f42; font-size: 14px; margin-top: 12px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function loginPage({ error } = {}) {
  return layout({
    title: 'เข้าสู่ระบบ - Bot Dashboard',
    body: `
<main>
  <div class="card">
    <h1>เข้าสู่ระบบแผงควบคุมบอท</h1>
    <form method="POST" action="/login">
      <label for="password">รหัสผ่าน</label>
      <input type="password" id="password" name="password" autofocus required>
      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
      <button type="submit">เข้าสู่ระบบ</button>
    </form>
  </div>
</main>`,
  });
}

function headerNav(active) {
  return `<header>
  <a href="/">Bot Dashboard</a>
  <a href="/logout" class="muted">ออกจากระบบ</a>
</header>`;
}

function guildListPage({ guilds }) {
  const items = guilds
    .map((g) => `<a href="/guild/${g.id}">${escapeHtml(g.name)} <span class="muted">(${g.memberCount} สมาชิก)</span></a>`)
    .join('');
  return layout({
    title: 'เลือกเซิร์ฟเวอร์ - Bot Dashboard',
    body: `
${headerNav()}
<main>
  <div class="card">
    <h1>เลือกเซิร์ฟเวอร์ที่ต้องการตั้งค่า</h1>
    <div class="guild-list">${items || '<p class="muted">บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ไหนเลย</p>'}</div>
  </div>
</main>`,
  });
}

function commandCheckboxes(allCommands, disabled) {
  return allCommands
    .map(
      (name) => `<div class="checkbox-row">
        <input type="checkbox" id="cmd-${name}" name="enabled_commands" value="${name}" ${disabled.includes(name) ? '' : 'checked'}>
        <label for="cmd-${name}" style="margin:0;">/${name}</label>
      </div>`,
    )
    .join('');
}

function guildSettingsPage({ guild, settings, textChannels, roles, allCommands, saved }) {
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
    title: `${guild.name} - Bot Dashboard`,
    body: `
${headerNav()}
<main>
  <div class="card">
    <h1>${escapeHtml(guild.name)}</h1>
    <div id="now-playing" class="now-playing"><p class="muted">กำลังโหลดสถานะ...</p></div>
  </div>

  <div class="card">
    <h2>ตั้งค่าบอท</h2>
    <form method="POST" action="/guild/${guild.id}">
      <label for="default_volume">ระดับเสียงเริ่มต้น (0-100)</label>
      <input type="number" id="default_volume" name="default_volume" min="0" max="100" value="${settings.default_volume}">

      <label for="announce_channel_id">ห้องที่แจ้งเพลง (now playing)</label>
      <select id="announce_channel_id" name="announce_channel_id">${channelOptions}</select>

      <label for="dj_role_id">จำกัดสิทธิ์สั่งเพลง (DJ role) - ใช้กับ /skip /stop /pause /resume /volume /loop /leave</label>
      <select id="dj_role_id" name="dj_role_id">${roleOptions}</select>

      <label>เปิด/ปิดคำสั่ง</label>
      ${commandCheckboxes(allCommands, settings.disabled_commands)}

      <button type="submit">บันทึกการตั้งค่า</button>
      ${saved ? '<div class="saved-badge">บันทึกแล้ว</div>' : ''}
    </form>
  </div>
</main>
<script>
async function refreshStatus() {
  try {
    const res = await fetch('/guild/${guild.id}/status.json');
    const data = await res.json();
    const el = document.getElementById('now-playing');
    if (!data.playing) {
      el.innerHTML = '<p class="muted">ตอนนี้ไม่มีเพลงเล่นอยู่</p>';
      return;
    }
    const queueList = data.queue.map((s, i) => (i === 0 ? '' : '<li>' + s + '</li>')).join('');
    el.innerHTML =
      '<p>กำลังเล่น: <span class="song">' + data.nowPlaying + '</span> ใน ' + data.voiceChannel + '</p>' +
      (queueList ? '<p class="muted">คิวถัดไป:</p><ul>' + queueList + '</ul>' : '');
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
