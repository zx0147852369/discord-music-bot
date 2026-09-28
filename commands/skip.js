const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('ข้ามไปเพลงถัดไป'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });
    try {
      const song = await queue.skip();
      await interaction.reply(`ข้ามแล้ว กำลังเล่น: **${song.name}**`);
    } catch (err) {
      await interaction.reply({ content: 'ไม่มีเพลงถัดไปในคิว', ephemeral: true });
    }
  },
};
