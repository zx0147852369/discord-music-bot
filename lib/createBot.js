const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube, isVoiceChannelEmpty } = require('distube');
const { YtDlpPlugin, resolveSong } = require('./ytDlpPlugin');
const { getGuildSettings, logEvent, recordSongPlay } = require('../db');
const { pickNextSong } = require('./autoplay');
const { profileChain } = require('./audioProfiles');
const { nowPlayingEmbed, queuedEmbed } = require('./embeds');
const { DJ_ONLY_COMMANDS, canUseDjCommand, isCommandDisabled } = require('./permissions');

// Prefer a system ffmpeg over the bundled static build: the static binary segfaults on any
// HTTPS input in some container images, which makes songs end instantly and silently.
function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    console.log(`Using ffmpeg from FFMPEG_PATH: ${process.env.FFMPEG_PATH}`);
    return process.env.FFMPEG_PATH;
  }
  const probe = require('child_process').spawnSync('ffmpeg', ['-version']);
  if (!probe.error && probe.status === 0) {
    console.log('Using system ffmpeg');
    return 'ffmpeg';
  }
  console.warn('System ffmpeg not found, falling back to ffmpeg-static (streams may fail!)');
  return require('ffmpeg-static');
}
const ffmpegPath = resolveFfmpegPath();

// Slash commands are identical for every bot, so load them once and share the collection.
let commandsCache = null;
function loadCommands() {
  if (commandsCache) return commandsCache;
  commandsCache = new Collection();
  const dir = path.join(__dirname, '..', 'commands');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(dir, file));
    commandsCache.set(command.data.name, command);
  }
  return commandsCache;
}

/**
 * Build a fully-wired music bot (Discord client + DisTube + all event handlers). The same
 * factory powers the shared system bot and every user's own bot. Call login(token) to connect.
 * Nothing here is global except the shared command list, so many bots coexist in one process.
 */
function createBot() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
  client.commands = loadCommands();
  client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    savePreviousSongs: true,
    plugins: [new YtDlpPlugin()],
    ffmpeg: { path: ffmpegPath },
  });

  const autoplayInFlight = new Set();

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
      logEvent({ guildId, type: 'autoplay', detail: `${song.name} (${reasonLabel[pick.reason] || 'อัตโนมัติ'})` });
    } catch (e) {
      console.error('Autoplay failed:', e.message);
      logEvent({ guildId, level: 'warn', type: 'autoplay_failed', detail: e.message });
      textChannel?.send('เล่นครบทุกเพลงในคิวแล้ว (หาเพลงต่ออัตโนมัติไม่สำเร็จ)');
    } finally {
      autoplayInFlight.delete(guildId);
    }
  }

  client.distube
    .on('initQueue', async (queue) => {
      const settings = getGuildSettings(queue.id);
      queue.setVolume(settings.default_volume);
      const af = profileChain(settings.audio_profile);
      if (af) queue.ffmpegArgs.output.af = af;
      if (settings.announce_channel_id) {
        try {
          const channel = await queue.textChannel?.guild.channels.fetch(settings.announce_channel_id);
          if (channel?.isTextBased()) queue.textChannel = channel;
        } catch {
          // announce channel deleted or inaccessible; keep the default text channel
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
        thumbnail: song.thumbnail || null,
      });
      queue.textChannel?.send({
        embeds: [
          nowPlayingEmbed({
            song,
            auto,
            voiceChannelName: queue.voice.channel?.name || null,
            bot: client.user ? { username: client.user.username, avatarURL: client.user.displayAvatarURL() } : null,
          }),
        ],
      });
    })
    .on('addSong', (queue, song) => {
      logEvent({ guildId: queue.id, type: 'queued', actor: song.user?.username || null, detail: `${song.name} (${song.formattedDuration})` });
      if (!song.metadata?.silent) queue.textChannel?.send({ embeds: [queuedEmbed({ song })] });
    })
    .on('finish', (queue) => {
      logEvent({ guildId: queue.id, type: 'queue_finished' });
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

  client.on('voiceStateUpdate', (oldState) => {
    const queue = client.distube.getQueue(oldState.guild.id);
    if (!queue || !isVoiceChannelEmpty(oldState)) return;
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
      logEvent({ guildId: interaction.guildId, level: 'warn', type: 'command_blocked', actor, detail: `/${interaction.commandName} — คำสั่งถูกปิดใช้งาน` });
      return interaction.reply({ content: 'คำสั่งนี้ถูกปิดใช้งานในเซิร์ฟเวอร์นี้', ephemeral: true });
    }
    if (DJ_ONLY_COMMANDS.has(interaction.commandName) && !canUseDjCommand(interaction.member)) {
      logEvent({ guildId: interaction.guildId, level: 'warn', type: 'command_blocked', actor, detail: `/${interaction.commandName} — ไม่มีสิทธิ์ (DJ role)` });
      return interaction.reply({ content: 'คำสั่งนี้ใช้ได้เฉพาะ DJ role หรือแอดมินเท่านั้น', ephemeral: true });
    }
    logEvent({ guildId: interaction.guildId, type: 'command', actor, detail: `/${interaction.commandName}${args ? ' ' + args : ''}` });
    try {
      await command.execute(interaction, client.distube);
    } catch (err) {
      console.error(err);
      logEvent({ guildId: interaction.guildId, level: 'error', type: 'command_error', actor, detail: `/${interaction.commandName}: ${err.message}` });
      const payload = { content: 'คำสั่งทำงานผิดพลาด', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
      else await interaction.reply(payload);
    }
  });

  return { client, distube: client.distube, login: (token) => client.login(token) };
}

module.exports = { createBot, loadCommands };
