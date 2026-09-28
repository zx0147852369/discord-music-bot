const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dargs = require('dargs');
const { PlayableExtractorPlugin, DisTubeError, Playlist, Song } = require('distube');

// @distube/yt-dlp's default download picks the GitHub release asset named plain "yt-dlp" on
// non-Windows platforms — that asset is a Python zipapp requiring python3 at runtime, not a
// standalone binary. Force the real standalone binary per platform before its env module
// (which reads YTDLP_URL once at require-time) loads.
if (!process.env.YTDLP_URL) {
  const standaloneAsset = { linux: 'yt-dlp_linux', darwin: 'yt-dlp_macos' }[process.platform];
  if (standaloneAsset) {
    process.env.YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${standaloneAsset}`;
  }
}
const { download } = require('@distube/yt-dlp');

const YTDLP_DIR = process.env.YTDLP_DIR || path.join(path.dirname(require.resolve('@distube/yt-dlp')), '..', 'bin');
const YTDLP_IS_WINDOWS = process.env.YTDLP_IS_WINDOWS ? true : process.platform === 'win32';
const YTDLP_FILENAME = process.env.YTDLP_FILENAME || `yt-dlp${YTDLP_IS_WINDOWS ? '.exe' : ''}`;
const YTDLP_PATH = path.join(YTDLP_DIR, YTDLP_FILENAME);

function args(url, flags = {}) {
  return [url].concat(dargs(flags, { useEquals: false })).filter(Boolean);
}

const YTDLP_TIMEOUT_MS = 30_000;

function json(url, flags, options) {
  // A malformed or unusual URL (e.g. a YouTube "Radio" mix) can make yt-dlp hang indefinitely
  // instead of erroring. Without a hard timeout, that leaves the Discord interaction stuck on
  // "thinking..." forever.
  const child = spawn(YTDLP_PATH, args(url, flags), { ...options, timeout: YTDLP_TIMEOUT_MS, killSignal: 'SIGKILL' });
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code, signal) => {
      if (signal === 'SIGKILL') return reject(new Error(`yt-dlp timed out after ${YTDLP_TIMEOUT_MS / 1000}s`));
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

// Some videos (often official/label music videos) enforce stricter checks that yt-dlp can only
// pass with a real authenticated session. If YOUTUBE_COOKIES (a Netscape-format cookies.txt,
// e.g. exported via the "Get cookies.txt LOCALLY" browser extension) is provided, write it out
// once and pass it to every yt-dlp call.
let cookiesPath;
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.mkdirSync(YTDLP_DIR, { recursive: true });
    cookiesPath = path.join(YTDLP_DIR, 'cookies.txt');
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
  } catch (e) {
    console.warn('Failed to write YOUTUBE_COOKIES to disk:', e.message);
    cookiesPath = undefined;
  }
}

const DUMP_FLAGS = {
  dumpSingleJson: true,
  noWarnings: true,
  preferFreeFormats: true,
  skipDownload: true,
  simulate: true,
  ...(cookiesPath ? { cookies: cookiesPath } : {}),
};

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
