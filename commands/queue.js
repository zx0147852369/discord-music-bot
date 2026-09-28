const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('แสดงคิวเพลงปัจจุบัน'),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });

    const list = queue.songs
      .slice(0, 15)
      .map((song, i) => `${i === 0 ? '▶️' : `${i}.`} **${song.name}** - ${song.formattedDuration}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('คิวเพลง')
      .setDescription(list)
      .setFooter({ text: `ทั้งหมด ${queue.songs.length} เพลง | ระดับเสียง ${queue.volume}%` });

    await interaction.reply({ embeds: [embed] });
  },
};
