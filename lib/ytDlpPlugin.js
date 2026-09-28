const path = require('path');
const { spawn } = require('child_process');
const dargs = require('dargs');
const { PlayableExtractorPlugin, DisTubeError, Playlist, Song } = require('distube');
const { download } = require('@distube/yt-dlp');

const YTDLP_DIR = process.env.YTDLP_DIR || path.join(path.dirname(require.resolve('@distube/yt-dlp')), '..', 'bin');
const YTDLP_IS_WINDOWS = process.env.YTDLP_IS_WINDOWS ? true : process.platform === 'win32';
const YTDLP_FILENAME = process.env.YTDLP_FILENAME || `yt-dlp${YTDLP_IS_WINDOWS ? '.exe' : ''}`;
const YTDLP_PATH = path.join(YTDLP_DIR, YTDLP_FILENAME);

function args(url, flags = {}) {
  return [url].concat(dargs(flags, { useEquals: false })).filter(Boolean);
}

function json(url, flags, options) {
  const child = spawn(YTDLP_PATH, args(url, flags), options);
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse yt-dlp output: ${e.message}\n${stdout.slice(0, 500)}`));
      }
    });
    child.on('error', reject);
  });
}

const isPlaylist = (info) => Array.isArray(info.entries);

class YtDlpSong extends Song {
  constructor(plugin, info, options = {}) {
    super(
      {
        plugin,
        source: info.extractor,
        playFromSource: true,
        id: info.id,
        name: info.title || info.fulltitle,
        url: info.webpage_url || info.original_url,
        isLive: info.is_live,
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
        duration: info.is_live ? 0 : info.duration,
        uploader: { name: info.uploader, url: info.uploader_url },
        views: info.view_count,
        likes: info.like_count,
        dislikes: info.dislike_count,
        reposts: info.repost_count,
        ageRestricted: Boolean(info.age_limit) && info.age_limit >= 18,
      },
      options,
    );
  }
}

const DUMP_FLAGS = { dumpSingleJson: true, noWarnings: true, preferFreeFormats: true, skipDownload: true, simulate: true };

class YtDlpPlugin extends PlayableExtractorPlugin {
  constructor({ update } = {}) {
    super();
    if (update ?? true) download().catch(() => {});
  }

  validate() {
    return true;
  }

  async resolve(url, options) {
    const info = await json(url, DUMP_FLAGS).catch((e) => {
      throw new DisTubeError('YTDLP_ERROR', `${e.stderr || e.message || e}`);
    });
    if (isPlaylist(info)) {
      if (info.entries.length === 0) throw new DisTubeError('YTDLP_ERROR', 'The playlist is empty');
      return new Playlist(
        {
          source: info.extractor,
          songs: info.entries.map((i) => new YtDlpSong(this, i, options)),
          id: info.id.toString(),
          name: info.title,
          url: info.webpage_url,
          thumbnail: info.thumbnails?.[0]?.url,
        },
        options,
      );
    }
    return new YtDlpSong(this, info, options);
  }

  async getStreamURL(song) {
    if (!song.url) {
      throw new DisTubeError('YTDLP_PLUGIN_INVALID_SONG', 'Cannot get stream url from invalid song.');
    }
    const info = await json(song.url, { ...DUMP_FLAGS, format: 'ba/ba*' }).catch((e) => {
      throw new DisTubeError('YTDLP_ERROR', `${e.stderr || e.message || e}`);
    });
    if (isPlaylist(info)) throw new DisTubeError('YTDLP_ERROR', 'Cannot get stream URL of a entire playlist');
    return info.url;
  }

  getRelatedSongs() {
    return [];
  }
}

module.exports = { YtDlpPlugin };
