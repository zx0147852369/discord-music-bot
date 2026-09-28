// Mirrors the bot's console output into a bounded in-memory buffer so it can be read from
// the dashboard without opening the host's log viewer.
//
// Kept in memory on purpose: console output is high-volume and disposable, and the host
// (Railway) already keeps its own copy. It resets when the process restarts.
const MAX_LINES = 500;
const MAX_LINE_LENGTH = 2000;

const buffer = [];
let seq = 0;

function push(level, args) {
  const text = args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      try {
        return require('util').inspect(a, { depth: 2, breakLength: 120 });
      } catch {
        return String(a);
      }
    })
    .join(' ');

  buffer.push({ id: ++seq, at: Date.now(), level, text: text.slice(0, MAX_LINE_LENGTH) });
  if (buffer.length > MAX_LINES) buffer.splice(0, buffer.length - MAX_LINES);
}

let installed = false;

function installConsoleCapture() {
  if (installed) return;
  installed = true;

  for (const [method, level] of [
    ['log', 'info'],
    ['info', 'info'],
    ['warn', 'warn'],
    ['error', 'error'],
  ]) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      push(level, args);
      original(...args);
    };
  }

  // Crashes and rejected promises never reach console.* on their own.
  process.on('uncaughtException', (err) => {
    push('error', ['uncaughtException:', err]);
    console.error('uncaughtException:', err);
  });
  process.on('unhandledRejection', (reason) => {
    push('error', ['unhandledRejection:', reason]);
  });
}

function getConsoleLogs({ level = null, limit = 300 } = {}) {
  const filtered = level ? buffer.filter((l) => l.level === level) : buffer;
  return filtered.slice(-Math.min(MAX_LINES, Math.max(1, limit))).reverse();
}

module.exports = { installConsoleCapture, getConsoleLogs };
