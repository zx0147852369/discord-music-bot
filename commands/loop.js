const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('ตั้งค่าเล่นวนซ้ำ')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('โหมดการวนซ้ำ')
        .setRequired(true)
        .addChoices(
          { name: 'ปิด', value: 'off' },
          { name: 'วนเพลงเดียว', value: 'song' },
          { name: 'วนทั้งคิว', value: 'queue' },
        ),
    ),
  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: 'ตอนนี้ไม่มีเพลงเล่นอยู่', ephemeral: true });

    const mode = interaction.options.getString('mode', true);
    const modeMap = { off: 0, song: 1, queue: 2 };
    queue.setRepeatMode(modeMap[mode]);

    const labels = { off: 'ปิดการวนซ้ำ', song: 'วนเพลงเดียว', queue: 'วนทั้งคิว' };
    await interaction.reply(labels[mode]);
  },
};
