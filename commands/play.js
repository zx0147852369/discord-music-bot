const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { isURL } = require('distube');
const { resolveSong, youtubeTitle } = require('../lib/ytDlpPlugin');

// A URL like ...&list=RDxxxx&start_radio=1 points at YouTube's auto-generated "Radio" mix,
// which has no fixed end — yt-dlp will hang trying to resolve it as a playlist. Strip the
// radio-mix params so only the single seed video is played. Real playlists (list=PLxxxx etc.)
// are left untouched.
function stripRadioMix(urlString) {
  const url = new URL(urlString);
  if (url.searchParams.get('list')?.startsWith('RD')) {
    url.searchParams.delete('list');
    url.searchParams.delete('start_radio');
  }
  return url.toString();
}

function isYouTubeUrl(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return /(^|\.)(youtube\.com|youtu\.be)$/.test(hostname);
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('เล่นเพลง (ชื่อเพลง หรือ ลิงก์ YouTube/SoundCloud)')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('ชื่อเพลงที่ต้องการค้นหา หรือลิงก์เพลง').setRequired(true),
    ),
  async execute(interaction, distube) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'คุณต้องเข้าห้องเสียง (voice channel) ก่อนใช้คำสั่งนี้', ephemeral: true });
    }

    // Checked before searching so a permission problem is reported instantly rather than
    // after a few seconds of lookup.
    const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    const missing = ['Connect', 'Speak'].filter((p) => !permissions?.has(PermissionsBitField.Flags[p]));
    if (missing.length) {
      return interaction.reply({
        content:
          `บอทไม่มีสิทธิ์ **${missing.join(' และ ')}** ในห้องเสียง **${voiceChannel.name}**\n` +
          'วิธีแก้: คลิกขวาที่ห้องเสียงนั้น → Edit Channel → Permissions → เพิ่ม role ของบอทแล้วเปิดสิทธิ์ Connect กับ Speak',
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query', true);
    const resolveOptions = { member: interaction.member };
    const playOptions = { member: interaction.member, textChannel: interaction.channel };

    try {
      const target = isURL(query) ? stripRadioMix(query) : query;
      let song;

      try {
        song = await resolveSong(distube, target, resolveOptions);
      } catch (err) {
        // A YouTube link the bot cannot extract is still identifiable: look the title up and
        // play the same song from SoundCloud instead.
        if (!isYouTubeUrl(target)) throw err;
        console.error('YouTube extraction failed, falling back to SoundCloud:', err.message);

        const title = await youtubeTitle(target);
        song = await resolveSong(distube, title, resolveOptions);
        if (!song) {
          return interaction.editReply(`เล่นจาก YouTube ไม่ได้ และหาเพลง **${title}** ใน SoundCloud ไม่เจอ`);
        }
        await distube.play(voiceChannel, song, playOptions);
        return interaction.editReply(`YouTube เล่นไม่ได้ เลยเปิดจาก SoundCloud แทน: **${song.name}**`);
      }

      if (!song) return interaction.editReply(`ไม่พบเพลงที่ค้นหา: **${query}**`);

      await distube.play(voiceChannel, song, playOptions);
      await interaction.editReply(`กำลังเพิ่มเข้าคิว: **${song.name}**`);
    } catch (err) {
      console.error(err);
      // Permissions can still change between the check above and actually joining.
      if (err.errorCode === 'VOICE_MISSING_PERMS') {
        return interaction.editReply(
          `บอทเข้าห้องเสียง **${voiceChannel.name}** ไม่ได้ — ตรวจสิทธิ์ Connect และ Speak ของ role บอทในห้องนั้น`,
        );
      }
      await interaction.editReply('เล่นเพลงไม่สำเร็จ ลองค้นด้วยชื่อเพลงแทนการใช้ลิงก์ดูครับ');
    }
  },
};
