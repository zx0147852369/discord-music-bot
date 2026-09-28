const { EmbedBuilder } = require('discord.js');

// Colours for the announcement embeds.
const COLOR_PLAYING = 0x5865f2; // Discord blurple for a user-requested song
const COLOR_AUTO = 0x23a55a; // green for songs the bot queued itself
const COLOR_QUEUED = 0x99a1b3; // muted for "added to queue"

const SOURCE_LABELS = {
  soundcloud: 'SoundCloud',
  youtube: 'YouTube',
  'youtube:search': 'YouTube',
  spotify: 'Spotify',
  bandcamp: 'Bandcamp',
  vimeo: 'Vimeo',
};

function sourceLabel(source) {
  if (!source) return null;
  const key = String(source).toLowerCase();
  return SOURCE_LABELS[key] || String(source).charAt(0).toUpperCase() + String(source).slice(1);
}

function safeTitle(song) {
  return (song.name || 'ไม่ทราบชื่อเพลง').slice(0, 250);
}

function durationText(song) {
  if (song.isLive) return '🔴 ถ่ายทอดสด';
  return song.formattedDuration || '—';
}

/**
 * The "now playing" announcement. Rich by design: clickable title, the track's own cover art
 * as the thumbnail, the artist, how long it is, who asked for it, where it came from, and a
 * footer tying it to the bot and voice channel.
 */
function nowPlayingEmbed({ song, auto = false, voiceChannelName = null, bot = null }) {
  const embed = new EmbedBuilder()
    .setColor(auto ? COLOR_AUTO : COLOR_PLAYING)
    .setAuthor({ name: auto ? '🔁 เล่นต่อเนื่องอัตโนมัติ' : '🎧 กำลังเล่นเพลง' })
    .setTitle(safeTitle(song))
    .addFields(
      { name: '⏱️ ความยาว', value: durationText(song), inline: true },
      { name: '🙋 ขอโดย', value: auto ? 'ระบบเล่นต่อเนื่อง' : song.user ? `${song.user}` : '—', inline: true },
    );

  if (song.url) embed.setURL(song.url);
  const uploader = song.uploader && song.uploader.name;
  if (uploader) embed.setDescription(`🎤 **${String(uploader).slice(0, 200)}**`);
  const src = sourceLabel(song.source);
  if (src) embed.addFields({ name: '📻 แหล่งที่มา', value: src, inline: true });
  if (song.thumbnail) embed.setThumbnail(song.thumbnail);

  const footerText = [bot && bot.username, voiceChannelName ? `🔊 ${voiceChannelName}` : null].filter(Boolean).join(' • ');
  if (footerText) embed.setFooter(bot && bot.avatarURL ? { text: footerText, iconURL: bot.avatarURL } : { text: footerText });
  embed.setTimestamp();
  return embed;
}

/** A compact embed for a song added behind the current one. */
function queuedEmbed({ song }) {
  const embed = new EmbedBuilder()
    .setColor(COLOR_QUEUED)
    .setAuthor({ name: '➕ เพิ่มเข้าคิวแล้ว' })
    .setTitle(safeTitle(song))
    .addFields(
      { name: '⏱️ ความยาว', value: durationText(song), inline: true },
      { name: '🙋 ขอโดย', value: song.user ? `${song.user}` : '—', inline: true },
    );
  if (song.url) embed.setURL(song.url);
  if (song.thumbnail) embed.setThumbnail(song.thumbnail);
  return embed;
}

module.exports = { nowPlayingEmbed, queuedEmbed, sourceLabel };
