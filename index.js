require('dotenv').config();
// Installed first so the dashboard's log view captures start-up output too.
require('./lib/consoleCapture').installConsoleCapture();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { DisTube, isVoiceChannelEmpty } = require('distube');
const { YtDlpPlugin, resolveSong } = require('./lib/ytDlpPlugin');
const { getGuildSettings, logEvent, recordSongPlay } = require('./db');
const { pickNextSong } = require('./lib/autoplay');
const { DJ_ONLY_COMMANDS, canUseDjCommand, isCommandDisabled } = require('./lib/permissions');
const startDashboard = require('./web/server');

// Prefer a system ffmpeg over the bundled static build: the static binary segfaults on any
// HTTPS input in some container images, which makes songs end instantly and silently.
function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const probe = require('child_process').spawnSync('ffmpeg', ['-version']);
  if (!probe.error && probe.status === 0) return 'ffmpeg';
  console.warn('System ffmpeg not found, falling back to ffmpeg-static');
  return require('ffmpeg-static');
}
const ffmpegPath = resolveFfmpegPath();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  savePreviousSongs: true,
  plugins: [new YtDlpPlugin()],
  ffmpeg: { path: ffmpegPath },
});

client.distube
  .on('initQueue', async (queue) => {
    const settings = getGuildSettings(queue.id);
    queue.setVolume(settings.default_volume);
    if (settings.announce_channel_id) {
      try {
        const channel = await queue.textChannel?.guild.channels.fetch(settings.announce_channel_id);
        if (channel?.isTextBased()) queue.textChannel = channel;
      } catch {
        // announce channel was deleted or no longer accessible; keep the default text channel
      }
    }
  })
  .on('playSong', (queue, song) => {
    const auto = Boolean(song.metadata?.auto);
    logEvent({
      guildId: queue.id,
      type: 'now_playing',
      actor: song.user?.username || null,
      detail: `${song.name} (${song.formattedDuration}) · ${queue.voice.channel?.name || '-'}${auto ? ' · อัตโนมัติ' : ''}`,
    });
    recordSongPlay({
      guildId: queue.id,
      title: song.name,
      url: song.url,
      source: song.source,
      duration: song.duration,
      requestedBy: song.user?.username || null,
      auto,
    });
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(auto ? 0x23a55a : 0x5865f2)
          .setTitle(auto ? 'เล่นต่อเนื่องอัตโนมัติ' : 'กำลังเล่นเพลง')
          .setDescription(`[${song.name}](${song.url})`)
          .addFields(
            { name: 'ความยาว', value: song.formattedDuration, inline: true },
            { name: 'ขอโดย', value: auto ? 'ระบบเล่นต่อเนื่อง' : `${song.user}`, inline: true },
          ),
      ],
    });
  })
  .on('addSong', (queue, song) => {
    logEvent({
      guildId: queue.id,
      type: 'queued',
      actor: song.user?.username || null,
      detail: `${song.name} (${song.formattedDuration})`,
    });
    queue.textChannel?.send(`เพิ่มเข้าคิวแล้ว: **${song.name}** (${song.formattedDuration})`);
  })
  .on('finish', (queue) => {
    logEvent({ guildId: queue.id, type: 'queue_finished' });
    // Captured now: DisTube deletes the queue as soon as this handler yields.
    continueListening(queue.id, queue.songs[0] || queue.previousSongs.at(-1), queue.voice.channel, queue.textChannel);
  })
  .on('disconnect', (queue) => {
    logEvent({ guildId: queue.id, type: 'voice_left' });
    queue.textChannel?.send('ออกจากห้องเสียงแล้ว');
  })
  .on('error', (e, queue) => {
    console.error(e);
    logEvent({ guildId: queue?.id, level: 'error', type: 'playback_error', detail: e?.message ?? String(e) });
    queue?.textChannel?.send(`เกิดข้อผิดพลาด: ${e?.message ?? e}`.slice(0, 1900));
  });

// Guards against two autoplay attempts overlapping for one server.
const autoplayInFlight = new Set();

/**
 * Keep the music going after a queue empties: find something similar to what just played
 * and start it in the same voice channel. Silent no-op when the server has it turned off.
 */
async function continueListening(guildId, lastSong, voiceChannel, textChannel) {
  const settings = getGuildSettings(guildId);
  if (!settings.autoplay) {
    textChannel?.send('เล่นครบทุกเพลงในคิวแล้ว');
    return;
  }
  if (autoplayInFlight.has(guildId) || !voiceChannel) return;
  autoplayInFlight.add(guildId);

  try {
    const pick = await pickNextSong(guildId, lastSong);
    if (!pick) {
      textChannel?.send('เล่นครบทุกเพลงในคิวแล้ว (ยังไม่มีเพลงให้เล่นต่ออัตโนมัติ)');
      return;
    }
    // DisTube removes the finished queue right after emitting; bail out if a real request
    // got in first while we were looking things up.
    if (client.distube.getQueue(guildId)) return;

    const song = await resolveSong(client.distube, pick.url, {
      member: voiceChannel.guild.members.me,
      metadata: { auto: true },
    });
    if (!song) throw new Error(`resolve returned nothing for ${pick.url}`);

    await client.distube.play(voiceChannel, song, {
      member: voiceChannel.guild.members.me,
      textChannel,
      metadata: { auto: true },
    });
    const reasonLabel = { related: 'เพลงแนวเดียวกัน', history: 'จากประวัติ', loop: 'เพลย์ลิสต์วนซ้ำ' };
    logEvent({
      guildId,
      type: 'autoplay',
      detail: `${song.name} (${reasonLabel[pick.reason] || 'อัตโนมัติ'})`,
    });
  } catch (e) {
    console.error('Autoplay failed:', e.message);
    logEvent({ guildId, level: 'warn', type: 'autoplay_failed', detail: e.message });
    textChannel?.send('เล่นครบทุกเพลงในคิวแล้ว (หาเพลงต่ออัตโนมัติไม่สำเร็จ)');
  } finally {
    autoplayInFlight.delete(guildId);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  logEvent({ type: 'bot_started', detail: `${client.user.tag} · ${client.guilds.cache.size} เซิร์ฟเวอร์` });
  startDashboard(client);
});

client.on('voiceStateUpdate', (oldState) => {
  const queue = client.distube.getQueue(oldState.guild.id);
  if (!queue || !isVoiceChannelEmpty(oldState)) return;

  // In 24/7 mode the bot keeps its seat in the voice channel; it only stops the music,
  // since nobody is left to hear it.
  const stay = getGuildSettings(oldState.guild.id).stay_24_7;
  queue.stop().catch(console.error);
  if (!stay) client.distube.voices.leave(oldState.guild.id);

  logEvent({
    guildId: oldState.guild.id,
    type: stay ? 'playback_stopped' : 'voice_left',
    detail: stay ? 'ไม่มีคนในห้องเสียง หยุดเพลงแต่ยังอยู่ในห้อง' : 'ไม่มีคนอยู่ในห้องเสียง',
  });
  queue.textChannel?.send(
    stay ? 'ไม่มีคนอยู่ในห้องเสียงแล้ว หยุดเพลงไว้ก่อน (บอทยังอยู่ในห้อง)' : 'ไม่มีคนอยู่ในห้องเสียงแล้ว บอทออกจากห้อง',
  );
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const actor = interaction.user.username;
  const args = interaction.options.data.map((o) => o.value).join(' ');

  if (isCommandDisabled(interaction.guildId, interaction.commandName)) {
    logEvent({
      guildId: interaction.guildId,
      level: 'warn',
      type: 'command_blocked',
      actor,
      detail: `/${interaction.commandName} — คำสั่งถูกปิดใช้งาน`,
    });
    return interaction.reply({ content: 'คำสั่งนี้ถูกปิดใช้งานในเซิร์ฟเวอร์นี้', ephemeral: true });
  }
  if (DJ_ONLY_COMMANDS.has(interaction.commandName) && !canUseDjCommand(interaction.member)) {
    logEvent({
      guildId: interaction.guildId,
      level: 'warn',
      type: 'command_blocked',
      actor,
      detail: `/${interaction.commandName} — ไม่มีสิทธิ์ (DJ role)`,
    });
    return interaction.reply({ content: 'คำสั่งนี้ใช้ได้เฉพาะ DJ role หรือแอดมินเท่านั้น', ephemeral: true });
  }

  logEvent({
    guildId: interaction.guildId,
    type: 'command',
    actor,
    detail: `/${interaction.commandName}${args ? ' ' + args : ''}`,
  });

  try {
    await command.execute(interaction, client.distube);
  } catch (err) {
    console.error(err);
    logEvent({
      guildId: interaction.guildId,
      level: 'error',
      type: 'command_error',
      actor,
      detail: `/${interaction.commandName}: ${err.message}`,
    });
    const payload = { content: 'คำสั่งทำงานผิดพลาด', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
