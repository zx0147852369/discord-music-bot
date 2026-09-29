require('dotenv').config();
// Installed first so the dashboard's log view captures start-up output too.
require('./lib/consoleCapture').installConsoleCapture();
const { logEvent } = require('./db');
const botHub = require('./lib/botManager');
const startDashboard = require('./web/server');

// The shared "system" bot anyone can use. Users who bring their own token get their own bot
// (managed by botHub); everything is driven from the dashboard.
const systemBot = botHub.initSystemBot(process.env.DISCORD_TOKEN);

if (systemBot) {
  systemBot.client.once('ready', () => {
    console.log(`Logged in as ${systemBot.client.user.tag}`);
    logEvent({ type: 'bot_started', detail: `${systemBot.client.user.tag} · ${systemBot.client.guilds.cache.size} เซิร์ฟเวอร์` });
    startDashboard(botHub);
    // Bring every user's own bot online after the system bot is ready.
    botHub.bootOwnBots().catch((e) => console.error('bootOwnBots failed:', e.message));
  });
} else {
  // No system token — still run the dashboard so people can register and connect their own bot.
  startDashboard(botHub);
  botHub.bootOwnBots().catch((e) => console.error('bootOwnBots failed:', e.message));
}
