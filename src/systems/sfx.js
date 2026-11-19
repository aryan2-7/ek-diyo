// Sound. Everything is synthesized with Web Audio, so the game has full sound before any audio file exists.
// To use real recordings, list them in public/audio/manifest.json (docs/AUDIO.md): a file named after an Sfx method
// replaces that effect, and five loop files replace the generated score. Nothing else has to change.
import { state, save } from '../state.js';
import { settings } from './settings.js';
import { Music } from './music.js';

let ctx = null;
let master = null;
let muffleF = null;
let sfxBus = null;
let musicBus = null;
let revIn = null;
let muted = false;
let ambientOn = false;
let resumeAmbient = false; // the music was playing when the tab went to the background
let ducked = false;
const files = { sfx: {} };

const PENTA = [587.33, 659.25, 783.99, 880.0, 987.77, 1174.66]; // D E G A B D
const SEVEN = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0]; // one note per tika colour (G major pentatonic, like the score)

// How long to wait after the first tap/key (or after load, when audio is already unlocked) before the music begins.
const AMBIENT_DELAY = 0;

const running = () => !!ctx && ctx.state === 'running' && !muted && settings.sfx > 0.001;

function impulse(sec = 2.6) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * sec);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += (Math.random() * 2 - 1 - lp) * 0.35; // a gentle low-pass keeps the room warm
      d[i] = lp * Math.pow(1 - i / len, 2.6);
    }
  }
  return buf;
}

/** Send a finished voice to the effects bus (and a little to the reverb). */
function out(node, wet = 0.1, pan = 0) {
  let n = node;
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    n.connect(p);
    n = p;
  }
  n.connect(sfxBus);
  if (wet > 0) {
    const g = ctx.createGain();
    g.gain.value = wet;
    n.connect(g);
    g.connect(revIn);
  }
}

function tone({ f = 440, to = null, dur = 0.2, type = 'sine', vol = 0.15, delay = 0, attack = 0.004, wet = 0.1, pan = 0, lp = 0 } = {}) {
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
  let n = o;
  if (lp) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = lp;
    o.connect(fl);
    n = fl;
  }
  n.connect(g);
  out(g, wet, pan);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.1, vol = 0.1, freq = 1500, q = 0.8, delay = 0, wet = 0.05, pan = 0 } = {}) {
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
  out(g, wet, pan);
  src.start(t0);
}

function bell(f, vol = 0.05, dur = 2.6, delay = 0) {
  tone({ f, dur, vol, attack: 0.01, delay, wet: 0.35 });
  tone({ f: f * 2.01, dur: dur * 0.6, vol: vol * 0.35, attack: 0.01, delay, wet: 0.35 });
  tone({ f: f * 3.97, dur: dur * 0.3, vol: vol * 0.15, attack: 0.01, delay, wet: 0.35 });
}

function playFile(name, pan = 0) {
  const b = files.sfx[name];
  if (!b || !running()) return false;
  const s = ctx.createBufferSource();
  s.buffer = b;
  const g = ctx.createGain();
  s.connect(g);
  out(g, 0.06, typeof pan === 'number' ? pan : 0);
  s.start();
  return true;
}

// ---- the effects --------------------------------------------------------------
const synth = {
  click: () => {
    Sfx.unlock();
    tone({ f: 520, to: 760, dur: 0.07, type: 'triangle', vol: 0.12 });
  },
  chime: () => {
    tone({ f: 784, dur: 0.9, vol: 0.11, wet: 0.3 });
    tone({ f: 1175, dur: 1.1, vol: 0.09, delay: 0.09, wet: 0.3 });
    tone({ f: 1568, dur: 1.2, vol: 0.05, delay: 0.18, wet: 0.3 });
  },
  caw: (pan = 0) => {
    [0, 0.21].forEach((d) => {
      tone({ f: 560, to: 330, dur: 0.18, type: 'sawtooth', vol: 0.05, delay: d, pan, lp: 1800, wet: 0.08 });
      noise({ dur: 0.16, vol: 0.03, freq: 1400, q: 0.7, delay: d, pan });
    });
  },
  flap: (pan = 0) => noise({ dur: 0.07, vol: 0.08, freq: 1700, q: 0.5, pan }),
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
    tone({ f: 988, dur: 0.15, vol: 0.1, wet: 0.25 });
    tone({ f: 1318, dur: 0.22, vol: 0.1, delay: 0.07, wet: 0.25 });
  },
  hit: () => {
    tone({ f: 170, to: 70, dur: 0.28, type: 'sawtooth', vol: 0.12, lp: 900 });
    noise({ dur: 0.15, vol: 0.12, freq: 400 });
  },
  yelp: () => tone({ f: 760, to: 320, dur: 0.18, type: 'square', vol: 0.05, lp: 2000 }),
  bark: () => {
    [0, 0.24].forEach((d) => {
      noise({ dur: 0.1, vol: 0.1, freq: 900, q: 1.1, delay: d });
      tone({ f: 300, to: 140, dur: 0.14, type: 'sawtooth', vol: 0.07, delay: d, lp: 1500 });
    });
  },
  slide: () => noise({ dur: 0.5, vol: 0.08, freq: 900, q: 0.4 }),
  paper: () => noise({ dur: 0.2, vol: 0.09, freq: 2400, q: 0.4 }),
  whoosh: () => noise({ dur: 0.7, vol: 0.12, freq: 700, q: 0.3, wet: 0.2 }),
  note: (i) => bell(SEVEN[i % 7], 0.1, 1.1),
  fanfare: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 0.09, 2.2, i * 0.16)),
  bell: () => bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.06),
  fail: () => tone({ f: 330, to: 165, dur: 0.7, type: 'triangle', vol: 0.1 }),
  tick: () => tone({ f: 1900, dur: 0.035, type: 'triangle', vol: 0.03, wet: 0 }),
  // new in this version
  step: () => {
    noise({ dur: 0.05, vol: 0.045, freq: 320, q: 0.7 });
    tone({ f: 95, to: 60, dur: 0.06, vol: 0.05 });
  },
  cowbell: () => {
    tone({ f: 560, dur: 0.4, type: 'square', vol: 0.035, lp: 1600, wet: 0.2 });
    tone({ f: 845, dur: 0.3, type: 'square', vol: 0.028, lp: 2200, wet: 0.2 });
  },
  footprint: (i = 0) => {
    const f = SEVEN[i % 7] / 2;
    tone({ f, dur: 1.3, vol: 0.07, wet: 0.4 });
    tone({ f: f * 3, dur: 0.5, vol: 0.025, delay: 0.02, wet: 0.4 });
  },
  shimmer: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone({ f, dur: 1.4, vol: 0.05, delay: i * 0.07, wet: 0.4 })),
  perfect: () => {
    tone({ f: 1319, dur: 0.35, vol: 0.08, wet: 0.3 });
    tone({ f: 1760, dur: 0.4, vol: 0.05, delay: 0.05, wet: 0.3 });
  },
};

const wrapped = {};
Object.entries(synth).forEach(([name, fn]) => {
  wrapped[name] = (...a) => {
    if (files.sfx[name] && playFile(name, a[0])) return;
    fn(...a);
  };
});

async function loadFiles() {
  try {
    const res = await fetch(new URL('audio/manifest.json', document.baseURI));
    if (!res.ok) return;
    const m = await res.json();
    const get = async (p) => {
      const r = await fetch(new URL(p, document.baseURI));
      if (!r.ok) throw new Error(p);
      return ctx.decodeAudioData(await r.arrayBuffer());
    };
    for (const [name, p] of Object.entries(m.sfx || {})) {
      try {
        files.sfx[name] = await get(p);
      } catch {
        /* a missing file just leaves the synthesized effect in place */
      }
    }
    const stems = m.music?.stems;
    if (Array.isArray(stems) && stems.length >= 5) Music.useStems(await Promise.all(stems.slice(0, 5).map(get)));
  } catch {
    /* no files: the synthesized kit is used */
  }
}

export const Sfx = {
  ...wrapped,
  init(game) {
    muted = !!state.muted;
    // iPhones mute Web Audio when the silent switch is on, unless the page asks for "playback" audio
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      /* not supported */
    }
    ctx = game.sound?.context || null;
    if (!ctx) return;
    game.sound.pauseOnBlur = false; // Phaser used to suspend all audio when the tab lost focus
    const mix = ctx.createGain();
    sfxBus = ctx.createGain();
    sfxBus.connect(mix);
    musicBus = ctx.createGain();
    musicBus.connect(mix);
    revIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = impulse();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.8;
    revIn.connect(conv);
    conv.connect(revOut);
    revOut.connect(mix);
    muffleF = ctx.createBiquadFilter(); // closes when the game is paused
    muffleF.type = 'lowpass';
    muffleF.frequency.value = 20000;
    muffleF.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 20;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    mix.connect(muffleF);
    muffleF.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
    this.setVolumes();
    Music.attach(ctx, musicBus, revIn);
    loadFiles();

    // Browsers keep audio locked until the first tap/key. Unlock on the very first one, anywhere,
    // and start the music then, so sound is simply on without finding a button.
    const first = () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, first, true));
      const begin = () => setTimeout(() => Sfx.startAmbient(), AMBIENT_DELAY);
      ctx.state === 'running' ? begin() : ctx.resume().then(begin, begin);
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, first, true));
    if (ctx.state === 'running') this.startAmbient(); // already unlocked
    else ctx.resume?.().then(() => ctx.state === 'running' && this.startAmbient(), () => {}); // allowed on some browsers: music from the first moment
    // the music keeps playing when the tab or window is in the background (the game pauses, the sound does not)
    const wake = () => {
      if (ctx.state === 'suspended' && !muted) ctx.resume().catch?.(() => {});
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('blur', wake);
    window.addEventListener('focus', wake);
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
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    if (muted) this.stopAmbient();
    else this.startAmbient();
    return muted;
  },
  /** Apply the music / effects sliders from the settings. */
  setVolumes() {
    if (!ctx || !sfxBus) return;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(settings.sfx, t, 0.05);
    musicBus.gain.setTargetAtTime(settings.music * 0.5 * (ducked ? 0.45 : 1), t, 0.2);
    // a slider at its lowest stops the music (and a raised one starts it again)
    if (settings.music <= 0.001) {
      if (ambientOn) {
        ambientOn = false;
        Music.stop();
      }
    } else if (!muted && ctx.state === 'running' && !ambientOn) {
      ambientOn = true;
      Music.start();
    }
  },
  /** How many of the five score layers play (the wicks: 1 = drone only, 5 = everything). */
  setLevel(n) {
    Music.setLevel(n);
  },
  /** Lower the music under a story card. */
  duck(on) {
    ducked = on;
    this.setVolumes();
  },
  /** Muffle everything while the game is paused. */
  muffle(on) {
    if (ctx && muffleF) muffleF.frequency.setTargetAtTime(on ? 650 : 20000, ctx.currentTime, 0.08);
  },
  startAmbient() {
    if (ambientOn || !ctx || muted) return;
    ambientOn = true;
    Music.start();
  },
  stopAmbient() {
    ambientOn = false;
    Music.stop();
  },
};
