require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { DisTube, isVoiceChannelEmpty } = require('distube');
const { YtDlpPlugin } = require('./lib/ytDlpPlugin');
const { getGuildSettings } = require('./db');
const { DJ_ONLY_COMMANDS, canUseDjCommand, isCommandDisabled } = require('./lib/permissions');
const startDashboard = require('./web/server');

const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static');

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
    queue.textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('กำลังเล่นเพลง')
          .setDescription(`[${song.name}](${song.url})`)
          .addFields(
            { name: 'ความยาว', value: song.formattedDuration, inline: true },
            { name: 'ขอโดย', value: `${song.user}`, inline: true },
          ),
      ],
    });
  })
  .on('addSong', (queue, song) => {
    queue.textChannel?.send(`เพิ่มเข้าคิวแล้ว: **${song.name}** (${song.formattedDuration})`);
  })
  .on('finish', (queue) => {
    queue.textChannel?.send('เล่นครบทุกเพลงในคิวแล้ว');
  })
  .on('disconnect', (queue) => {
    queue.textChannel?.send('ออกจากห้องเสียงแล้ว');
  })
  .on('error', (e, queue) => {
    console.error(e);
    queue?.textChannel?.send(`เกิดข้อผิดพลาด: ${e?.message ?? e}`.slice(0, 1900));
  });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  startDashboard(client);
});

client.on('voiceStateUpdate', (oldState) => {
  const queue = client.distube.getQueue(oldState.guild.id);
  if (queue && isVoiceChannelEmpty(oldState)) {
    queue.textChannel?.send('ไม่มีคนอยู่ในห้องเสียงแล้ว บอทออกจากห้อง');
    queue.stop().catch(console.error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (isCommandDisabled(interaction.guildId, interaction.commandName)) {
    return interaction.reply({ content: 'คำสั่งนี้ถูกปิดใช้งานในเซิร์ฟเวอร์นี้', ephemeral: true });
  }
  if (DJ_ONLY_COMMANDS.has(interaction.commandName) && !canUseDjCommand(interaction.member)) {
    return interaction.reply({ content: 'คำสั่งนี้ใช้ได้เฉพาะ DJ role หรือแอดมินเท่านั้น', ephemeral: true });
  }

  try {
    await command.execute(interaction, client.distube);
  } catch (err) {
    console.error(err);
    const payload = { content: 'คำสั่งทำงานผิดพลาด', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
