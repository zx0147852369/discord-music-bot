const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('หยุดเพลงชั่วคราว'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });
    await queue.pause();
    await interaction.reply('หยุดเพลงชั่วคราวแล้ว');
  },
};
