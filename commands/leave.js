const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('ให้บอทออกจากห้องเสียง'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'บอทไม่ได้อยู่ในห้องเสียง', ephemeral: true });
    await queue.stop();
    await interaction.reply('ออกจากห้องเสียงแล้ว');
  },
};
