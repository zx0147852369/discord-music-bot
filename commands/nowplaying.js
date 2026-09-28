const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('แสดงเพลงที่กำลังเล่นอยู่'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('กำลังเล่นอยู่')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: 'ความยาว', value: `${queue.currentTime.toFixed(0)}s / ${song.formattedDuration}`, inline: true },
        { name: 'ขอโดย', value: `${song.user}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
