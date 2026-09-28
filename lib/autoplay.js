const { getRecentlyPlayedUrls, getRandomPastSongs, getLoopNext } = require('../db');
const { getRelatedTracks } = require('./ytDlpPlugin');

// How far back to look when avoiding repeats. Large enough that a short rotation does not
// loop on itself, small enough that a server with a small library still has options.
const RECENT_WINDOW = 30;

/**
 * Choose what to play once a queue runs dry.
 *
 * A hand-picked loop list wins outright: the server asked for exactly those songs on repeat,
 * so rotate through them and pull in nothing new. Otherwise fall back to discovery — a track
 * SoundCloud considers similar to the one that just finished, then anything this server has
 * played before — skipping recently played tracks so the music keeps moving.
 */
async function pickNextSong(guildId, lastSong) {
  const loop = getLoopNext(guildId);
  if (loop) {
    return { url: loop.url, title: loop.title, source: loop.source, duration: loop.duration, reason: 'loop' };
  }

  const recent = new Set(getRecentlyPlayedUrls(guildId, RECENT_WINDOW));

  if (lastSong?.url) {
    try {
      const related = await getRelatedTracks(lastSong.url, 15);
      const fresh = related.find((t) => !recent.has(t.url));
      if (fresh) return { ...fresh, reason: 'related' };
      // Everything similar was played recently — better a repeat than silence.
      if (related.length) return { ...related[0], reason: 'related' };
    } catch (e) {
      console.warn('Autoplay: could not fetch related tracks:', e.message);
    }
  }

  const past = getRandomPastSongs(guildId, 10).find((s) => !recent.has(s.url));
  return past ? { ...past, reason: 'history' } : null;
}

module.exports = { pickNextSong };
