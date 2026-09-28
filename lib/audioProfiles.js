// Sound presets offered in the dashboard. Each value is an ffmpeg `-af` chain, validated to
// be syntactically valid and to not clip (a final alimiter caps the peak at ~0.9). They are
// applied through queue.ffmpegArgs.output.af, so they take effect from the first frame of a
// song with no mid-playback restart, and carry to every song in the queue.
const PROFILES = {
  off: {
    label: 'ปกติ (ไม่ปรับแต่ง)',
    desc: 'เสียงต้นฉบับ ไม่ใส่เอฟเฟกต์',
    chain: null,
  },
  enhance: {
    label: 'ชัด + มีมิติ + เบสแน่น',
    desc: 'เพิ่มเบส เสียงแหลม และความกว้างสเตอริโอแบบสมดุล เหมาะกับเพลงทั่วไป',
    chain: 'bass=g=5,treble=g=2,extrastereo=m=1.2,alimiter=limit=0.9',
  },
  deepbass: {
    label: 'เบสหนัก',
    desc: 'ดันเบสให้แน่นเป็นพิเศษ เหมาะกับเพลงแดนซ์/ฮิปฮอป',
    chain: 'bass=g=8:f=100,extrastereo=m=1.1,alimiter=limit=0.9',
  },
  vocal: {
    label: 'เสียงร้องใส',
    desc: 'เน้นเสียงร้องให้คมชัด ตัดเสียงอื้อความถี่ต่ำทิ้ง',
    chain: 'highpass=f=60,equalizer=f=2500:width_type=q:w=1.2:g=2.5,treble=g=4,alimiter=limit=0.9',
  },
};

const DEFAULT_PROFILE = 'enhance';

const isValidProfile = (name) => Object.prototype.hasOwnProperty.call(PROFILES, name);

// The ffmpeg chain for a profile, or null for no processing. Unknown names fall back to the
// default profile so a stale/garbage value never silently disables the sound.
function profileChain(name) {
  const key = isValidProfile(name) ? name : DEFAULT_PROFILE;
  return PROFILES[key].chain;
}

module.exports = { PROFILES, DEFAULT_PROFILE, isValidProfile, profileChain };
