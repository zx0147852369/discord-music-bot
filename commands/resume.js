const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อ'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });
    await queue.resume();
    await interaction.reply('เล่นเพลงต่อแล้ว');
  },
};
