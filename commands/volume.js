const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('ปรับระดับเสียง (0-100)')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('ระดับเสียงเป็นเปอร์เซ็นต์').setRequired(true).setMinValue(0).setMaxValue(100),
    ),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });
    const level = interaction.options.getInteger('level', true);
    queue.setVolume(level);
    await interaction.reply(`ปรับระดับเสียงเป็น ${level}%`);
  },
};
