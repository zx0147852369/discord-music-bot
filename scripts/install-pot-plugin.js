// Downloads the bgutil PO-token plugin for yt-dlp at install time.
//
// YouTube blocks some videos ("Sign in to confirm you're not a bot") when the request
// comes from a datacenter IP. yt-dlp can get past that with a proof-of-origin token,
// which this plugin fetches from a POT provider server (see POT_BASE_URL).
//
// This never fails the install: without the plugin the bot still plays everything that
// does not require a token.
const fs = require('fs');
const path = require('path');

const VERSION = process.env.POT_PLUGIN_VERSION || '2.0.0';
const DEST_DIR = path.join(__dirname, '..', 'pot-plugin');
const DEST_FILE = path.join(DEST_DIR, 'bgutil-ytdlp-pot-provider.zip');
const URL = `https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${VERSION}/bgutil-ytdlp-pot-provider.zip`;

(async () => {
  try {
    const res = await fetch(URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // A GitHub error page would also be "ok"; a real zip starts with "PK".
    if (buf.length < 1000 || buf.subarray(0, 2).toString() !== 'PK') {
      throw new Error(`unexpected payload (${buf.length} bytes)`);
    }
    fs.mkdirSync(DEST_DIR, { recursive: true });
    fs.writeFileSync(DEST_FILE, buf);
    console.log(`[pot-plugin] installed v${VERSION} (${buf.length} bytes)`);
  } catch (e) {
    console.warn(`[pot-plugin] skipped: ${e.message} — videos needing a PO token may fail to play`);
  }
})();
