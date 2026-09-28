const { SlashCommandBuilder } = require('discord.js');

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
      await distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      await interaction.editReply(`กำลังค้นหา: **${query}**`);
    } catch (err) {
      console.error(err);
      await interaction.editReply('เล่นเพลงไม่สำเร็จ ลองใหม่อีกครั้ง หรือใช้ลิงก์ YouTube โดยตรง');
    }
  },
};
