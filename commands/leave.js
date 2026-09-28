const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('ให้บอทออกจากห้องเสียง'),
  async execute(interaction, distube) {
    const connected = distube.voices.get(interaction.guildId);
    if (!connected) return interaction.reply({ content: 'บอทไม่ได้อยู่ในห้องเสียง', ephemeral: true });

    // queue.stop() only stops playback — leaving the channel is a separate call.
    await distube.getQueue(interaction.guildId)?.stop();
    distube.voices.leave(interaction.guildId);
    await interaction.reply('ออกจากห้องเสียงแล้ว');
  },
};
