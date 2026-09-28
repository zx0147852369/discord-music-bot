const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('หยุดเพลงและล้างคิวทั้งหมด'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });
    await queue.stop();
    await interaction.reply('หยุดเพลงและล้างคิวแล้ว');
  },
};
