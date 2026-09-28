const fs = require('fs');
const os = require('os');
const path = require('path');
const { dbPath } = require('../db');

/**
 * Read one number out of a cgroup file. Returns null when the file is missing (not a
 * container, or a different cgroup version) or when nothing is actually capped.
 */
function readLimit(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw || raw === 'max') return null;
    const n = Number(raw);
    // cgroup v1 writes a huge sentinel value instead of "max" when there is no limit.
    return Number.isFinite(n) && n > 0 && n < Number.MAX_SAFE_INTEGER / 2 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Memory as the container sees it. os.totalmem() reports the whole host, so on a platform
 * like Railway it would show tens of gigabytes the bot can never touch and make usage look
 * like a rounding error. The cgroup files are what the limit is actually enforced against.
 */
function containerMemory() {
  const v2Limit = readLimit('/sys/fs/cgroup/memory.max');
  const v2Used = readLimit('/sys/fs/cgroup/memory.current');
  if (v2Limit && v2Used) return { total: v2Limit, used: v2Used };

  const v1Limit = readLimit('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  const v1Used = readLimit('/sys/fs/cgroup/memory/memory.usage_in_bytes');
  if (v1Limit && v1Used) return { total: v1Limit, used: v1Used };

  return null;
}

/** How many cores the container may use, as a fraction. Null when nothing limits it. */
function containerCpuLimit() {
  try {
    const [quota, period] = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(/\s+/);
    if (quota !== 'max' && Number(period) > 0) return Number(quota) / Number(period);
  } catch {
    // not cgroup v2 — fall through to v1
  }
  const quota = readLimit('/sys/fs/cgroup/cpu/cpu.cfs_quota_us');
  const period = readLimit('/sys/fs/cgroup/cpu/cpu.cfs_period_us');
  return quota && period ? quota / period : null;
}

function cpuTotals() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const [kind, ms] of Object.entries(cpu.times)) {
      total += ms;
      if (kind === 'idle') idle += ms;
    }
  }
  return { idle, total };
}

let lastCpu = cpuTotals();
let lastProcessCpu = process.cpuUsage();
let lastSampleAt = Date.now();
const usage = { process: 0, system: 0 };

/**
 * A CPU percentage only means something over an interval. Sampling in the background keeps
 * the numbers describing the last few seconds instead of averaging over the whole uptime,
 * which would flatten out to nothing on a long-running bot.
 */
function sample() {
  const nowCpu = cpuTotals();
  const nowProcess = process.cpuUsage();
  const elapsedMs = Date.now() - lastSampleAt;

  const totalDelta = nowCpu.total - lastCpu.total;
  const idleDelta = nowCpu.idle - lastCpu.idle;
  if (totalDelta > 0) {
    usage.system = Math.min(100, Math.max(0, (1 - idleDelta / totalDelta) * 100));
  }
  if (elapsedMs > 0) {
    const busyMs = (nowProcess.user - lastProcessCpu.user + nowProcess.system - lastProcessCpu.system) / 1000;
    usage.process = Math.max(0, (busyMs / elapsedMs) * 100);
  }

  lastCpu = nowCpu;
  lastProcessCpu = nowProcess;
  lastSampleAt = Date.now();
}

// unref'd so this never keeps the process alive on its own.
setInterval(sample, 5000).unref();

function diskUsage(dir) {
  try {
    const fsStat = fs.statfsSync(dir);
    const total = fsStat.blocks * fsStat.bsize;
    const free = fsStat.bavail * fsStat.bsize;
    if (!total) return null;
    return { total, free, used: total - free, percent: ((total - free) / total) * 100, path: dir };
  } catch {
    return null;
  }
}

/** The database plus its write-ahead log, which is where most of the growth shows up. */
function databaseBytes() {
  let bytes = 0;
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      bytes += fs.statSync(dbPath + suffix).size;
    } catch {
      // that companion file does not exist right now
    }
  }
  return bytes;
}

function snapshot() {
  // The background tick may be up to five seconds away; take a reading now so a page opened
  // right after start-up shows real numbers instead of a flat zero.
  if (Date.now() - lastSampleAt >= 1000) sample();

  const container = containerMemory();
  const cpuLimit = containerCpuLimit();
  const cores = os.cpus().length;
  const memory = container || { total: os.totalmem(), used: os.totalmem() - os.freemem() };
  const mem = process.memoryUsage();

  return {
    at: Date.now(),
    host: {
      hostname: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      node: process.version,
      cpuModel: os.cpus()[0]?.model?.trim() || '-',
      cores,
      cpuAllowance: cpuLimit,
      containerised: Boolean(container),
      service: process.env.RAILWAY_SERVICE_NAME || null,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
      region: process.env.RAILWAY_REPLICA_REGION || null,
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    },
    cpu: {
      // Share of what this process is *allowed* to use, so 100% means it is genuinely maxed
      // out rather than merely busy on one core of many.
      botPercent: Math.min(100, usage.process / (cpuLimit || cores)),
      botCorePercent: usage.process,
      systemPercent: usage.system,
      loadAvg: os.platform() === 'win32' ? null : os.loadavg()[0],
    },
    memory: {
      total: memory.total,
      used: memory.used,
      percent: memory.total ? (memory.used / memory.total) * 100 : 0,
      scope: container ? 'container' : 'host',
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
    disk: diskUsage(path.dirname(dbPath)),
    storage: {
      dbPath,
      dbBytes: databaseBytes(),
      persistent: Boolean(process.env.DB_PATH || process.env.RAILWAY_VOLUME_MOUNT_PATH),
    },
    uptime: { process: process.uptime(), system: os.uptime() },
  };
}

module.exports = { snapshot };
