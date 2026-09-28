const { SlashCommandBuilder } = require('discord.js');
const { isURL } = require('distube');
const ytsr = require('@distube/ytsr');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('เล่นเพลงจาก YouTube (ลิงก์ หรือ ชื่อเพลง)')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('ลิงก์ YouTube หรือชื่อเพลงที่ต้องการค้นหา').setRequired(true),
    ),
  async execute(interaction, distube) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'คุณต้องเข้าห้องเสียง (voice channel) ก่อนใช้คำสั่งนี้', ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query', true);

    try {
      let target = query;
      let label = query;

      if (!isURL(query)) {
        const result = await ytsr(query, { limit: 1, type: 'video' });
        const video = result.items[0];
        if (!video) {
          return interaction.editReply(`ไม่พบเพลงที่ค้นหา: **${query}**`);
        }
        target = video.url;
        label = video.name;
      }

      await distube.play(voiceChannel, target, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      await interaction.editReply(`กำลังเพิ่มเข้าคิว: **${label}**`);
    } catch (err) {
      console.error(err);
      await interaction.editReply('เล่นเพลงไม่สำเร็จ ลองใหม่อีกครั้ง หรือใช้ลิงก์ YouTube โดยตรง');
    }
  },
};
