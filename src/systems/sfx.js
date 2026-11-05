// Tiny synthesized sound kit (Web Audio) so the game has feedback before real audio files exist.
// Replace with recorded files later: keep the same Sfx.* method names and nothing else has to change.
import { state, save } from '../state.js';

let ctx = null;
let master = null;
let muted = false;
let ambientOn = false;
let bellTimer = null;
let drone = null;

const PENTA = [587.33, 659.25, 783.99, 880.0, 987.77, 1174.66]; // D E G A B D
const SEVEN = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0]; // one note per tika colour

// How long to wait after the first tap/key (or after load, when audio is already unlocked)
// before the ambience begins: the starting screen gets a beat of quiet first.
const AMBIENT_DELAY = 1500;

const running = () => !!ctx && ctx.state === 'running' && !muted;

function tone({ f = 440, to = null, dur = 0.2, type = 'sine', vol = 0.15, delay = 0, attack = 0.004 } = {}) {
  if (!running()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.1, vol = 0.1, freq = 1500, q = 0.8, delay = 0 } = {}) {
  if (!running()) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(t0);
}

function bell(f, vol = 0.05, dur = 2.6, delay = 0) {
  tone({ f, dur, vol, attack: 0.01, delay });
  tone({ f: f * 2.01, dur: dur * 0.6, vol: vol * 0.35, attack: 0.01, delay });
  tone({ f: f * 3.97, dur: dur * 0.3, vol: vol * 0.15, attack: 0.01, delay });
}

export const Sfx = {
  init(game) {
    muted = !!state.muted;
    ctx = game.sound?.context || null;
    if (ctx) {
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      // Browsers keep audio locked until the first tap/key. Unlock on the very first one, anywhere,
      // and start the ambient bells + drone then, so sound is simply on without finding a button.
      const first = () => {
        ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, first, true));
        const begin = () => setTimeout(() => Sfx.startAmbient(), AMBIENT_DELAY);
        ctx.state === 'running' ? begin() : ctx.resume().then(begin, begin);
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, first, true));
      if (ctx.state === 'running') setTimeout(() => this.startAmbient(), AMBIENT_DELAY); // already unlocked (e.g. returning from another page)
    }
  },
  unlock() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },
  get muted() {
    return muted;
  },
  toggleMute() {
    muted = !muted;
    state.muted = muted;
    save();
    if (muted) this.stopAmbient();
    else this.startAmbient();
    return muted;
  },

  click: () => {
    Sfx.unlock();
    tone({ f: 520, to: 760, dur: 0.07, type: 'triangle', vol: 0.12 });
  },
  chime: () => {
    tone({ f: 784, dur: 0.9, vol: 0.11 });
    tone({ f: 1175, dur: 1.1, vol: 0.09, delay: 0.09 });
    tone({ f: 1568, dur: 1.2, vol: 0.05, delay: 0.18 });
  },
  caw: () => {
    tone({ f: 640, to: 360, dur: 0.17, type: 'sawtooth', vol: 0.05 });
    tone({ f: 600, to: 330, dur: 0.2, type: 'sawtooth', vol: 0.05, delay: 0.2 });
  },
  flap: () => noise({ dur: 0.07, vol: 0.08, freq: 1700, q: 0.5 }),
  light: () => {
    noise({ dur: 0.25, vol: 0.09, freq: 3200, q: 0.9 });
    tone({ f: 330, to: 520, dur: 0.25, type: 'triangle', vol: 0.06 });
  },
  jump: () => tone({ f: 320, to: 640, dur: 0.15, type: 'triangle', vol: 0.12 }),
  land: () => {
    noise({ dur: 0.06, vol: 0.1, freq: 500, q: 0.6 });
    tone({ f: 130, to: 80, dur: 0.07, vol: 0.1 });
  },
  collect: () => {
    tone({ f: 988, dur: 0.15, vol: 0.1 });
    tone({ f: 1318, dur: 0.22, vol: 0.1, delay: 0.07 });
  },
  hit: () => {
    tone({ f: 170, to: 70, dur: 0.28, type: 'sawtooth', vol: 0.12 });
    noise({ dur: 0.15, vol: 0.12, freq: 400 });
  },
  yelp: () => tone({ f: 760, to: 320, dur: 0.18, type: 'square', vol: 0.05 }),
  bark: () => {
    tone({ f: 240, to: 130, dur: 0.12, type: 'sawtooth', vol: 0.09 });
    tone({ f: 250, to: 120, dur: 0.12, type: 'sawtooth', vol: 0.09, delay: 0.22 });
  },
  paper: () => noise({ dur: 0.2, vol: 0.09, freq: 2400, q: 0.4 }),
  whoosh: () => noise({ dur: 0.7, vol: 0.12, freq: 700, q: 0.3 }),
  note: (i) => bell(SEVEN[i % 7], 0.1, 1.1),
  fanfare: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 0.09, 2.2, i * 0.16)),
  bell: () => bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.06),
  fail: () => tone({ f: 330, to: 165, dur: 0.7, type: 'triangle', vol: 0.1 }),

  startAmbient() {
    if (ambientOn || !ctx) return;
    ambientOn = true;
    if (!drone && !muted) {
      drone = ['sine', 'sine'].map((type, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = i ? 220 : 146.83;
        g.gain.value = 0.012;
        o.connect(g);
        g.connect(master);
        o.start();
        return o;
      });
    }
    const next = () => {
      if (!ambientOn) return;
      if (running()) bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.035, 3.2);
      bellTimer = setTimeout(next, 2200 + Math.random() * 3800);
    };
    next();
  },
  stopAmbient() {
    ambientOn = false;
    clearTimeout(bellTimer);
    if (drone) {
      drone.forEach((o) => o.stop());
      drone = null;
    }
  },
};
