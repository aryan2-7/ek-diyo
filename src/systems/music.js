// The score. Five layers join one by one, like the five wicks:
//   1 tanpura drone + soft bells · 2 bansuri flute · 3 madal pulse · 4 choir pad · 5 shimmering bells
// Everything is synthesized in the browser (G major pentatonic, ~75 bpm). If audio/manifest.json lists five loop
// files they replace it (docs/AUDIO.md). The module only needs an AudioContext, a bus and a reverb input,
// so it can also be rendered offline for tests.

const BEAT = 0.8; // seconds
const ROOT = 98.0; // G2
const hz = (semi) => ROOT * Math.pow(2, semi / 12);
const PENTA = [0, 2, 4, 7, 9]; // G A B D E
const FLUTE = [21, 24, 26, 28, 31, 33, 36, 38]; // E4 G4 A4 B4 D5 E5 G5 A5
// pad chords stay inside the pentatonic scale, so nothing ever clashes with the drone
const CHORDS = [[12, 19, 26], [9, 16, 24], [14, 21, 28], [7, 14, 19]];
const GE = [0, 6, 8, 11]; // madal bass hits (16 steps = 8 beats)
const TA = [4, 12, 14];
const GHOST = [2, 7, 10, 15];
const LAYERS = 5;
const LAYER_VOL = [1, 1, 0.9, 0.75, 0.65];

let C = null;
let bus = null;
let rev = null;
const dry = [];
const wet = [];
let level = 0;
let timer = null; // { stop() }
let nextT = 0;
let beat = 0;
let noiseBuf = null;
let fi = 2; // where the flute is on its scale
let generative = true;
let stemSrc = [];
let track = null; // { src, filter, gain }: one finished recording that replaces the generated score
const TRACK_VOL = 1.0;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** A steady tick that is not slowed down when the tab is in the background (a worker; falls back to setInterval). */
function makeTicker(cb, ms) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = cb;
    return {
      stop() {
        w.terminate();
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    const id = setInterval(cb, ms);
    return { stop: () => clearInterval(id) };
  }
}

function noiseSource(t, dur) {
  const s = C.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur);
  return s;
}

/** Send a voice to a layer's dry bus and (a little) to its reverb bus. */
function route(node, layer, wetAmt = 0.2, pan = 0) {
  let n = node;
  if (pan && C.createStereoPanner) {
    const p = C.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    n.connect(p);
    n = p;
  }
  n.connect(dry[layer]);
  if (wetAmt > 0) {
    const g = C.createGain();
    g.gain.value = wetAmt;
    n.connect(g);
    g.connect(wet[layer]);
  }
}

// ---- voices -----------------------------------------------------------------
function pluck(f, t, vol) {
  const g = C.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
  const lp = C.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2.2;
  lp.frequency.setValueAtTime(Math.min(f * 14, 6000), t); // bright pluck that mellows, like a buzzing tanpura string
  lp.frequency.exponentialRampToValueAtTime(f * 2.4, t + 2.4);
  [1, 1.0032, 0.9968].forEach((d, i) => {
    const o = C.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f * d;
    const og = C.createGain();
    og.gain.value = i ? 0.3 : 0.5;
    o.connect(og);
    og.connect(lp);
    o.start(t);
    o.stop(t + 3.9);
  });
  lp.connect(g);
  route(g, 0, 0.4);
}

function bell(f, t, vol, layer, pan = 0) {
  [[1, 1, 3.6], [2.01, 0.35, 2.2], [3.97, 0.14, 1.2]].forEach(([r, a, d]) => {
    const o = C.createOscillator();
    const g = C.createGain();
    o.type = 'sine';
    o.frequency.value = f * r;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * a, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    route(g, layer, 0.55, pan);
    o.start(t);
    o.stop(t + d + 0.05);
  });
}

function flute(f, t, dur, vol, from) {
  const g = C.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.1);
  g.gain.setValueAtTime(vol, t + Math.max(0.11, dur - 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  const o = C.createOscillator();
  o.type = 'sine';
  if (from && from !== f) {
    o.frequency.setValueAtTime(from, t); // a short slide up or down into the note
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  } else o.frequency.value = f;
  const lfo = C.createOscillator(); // vibrato that arrives after the note has opened
  lfo.frequency.value = 5.2;
  const lg = C.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.6, dur));
  lfo.connect(lg);
  lg.connect(o.frequency);
  const h2 = C.createOscillator();
  h2.type = 'sine';
  h2.frequency.value = f * 2;
  const h2g = C.createGain();
  h2g.gain.value = 0.2;
  h2.connect(h2g);
  const mix = C.createGain();
  o.connect(mix);
  h2g.connect(mix);
  mix.connect(g);
  const n = noiseSource(t, dur + 0.3); // the breath of the bansuri
  const bp = C.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(f * 3, 5000);
  bp.Q.value = 0.9;
  const ng = C.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
  ng.gain.exponentialRampToValueAtTime(0.012, t + 0.2);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(g);
  route(g, 1, 0.5, (Math.random() - 0.5) * 0.3);
  [o, lfo, h2].forEach((x) => {
    x.start(t);
    x.stop(t + dur + 0.3);
  });
}

function madal(kind, t, vol) {
  if (kind === 'ge') {
    const o = C.createOscillator();
    const g = C.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(125, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g);
    route(g, 2, 0.12);
    o.start(t);
    o.stop(t + 0.45);
    const n = noiseSource(t, 0.06);
    const lp = C.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const ng = C.createGain();
    ng.gain.setValueAtTime(vol * 0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(lp);
    lp.connect(ng);
    route(ng, 2, 0.05);
    return;
  }
  const n = noiseSource(t, 0.14);
  const bp = C.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = kind === 'ta' ? 1900 : 2800;
  bp.Q.value = 1.3;
  const ng = C.createGain();
  ng.gain.setValueAtTime(vol, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'ta' ? 0.1 : 0.04));
  n.connect(bp);
  bp.connect(ng);
  route(ng, 2, 0.15);
  if (kind === 'ta') {
    const o = C.createOscillator();
    const g = C.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(190, t + 0.07);
    g.gain.setValueAtTime(vol * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g);
    route(g, 2, 0.1);
    o.start(t);
    o.stop(t + 0.1);
  }
}

function pad(notes, t, dur) {
  notes.forEach((semi) => {
    const f = hz(semi);
    const g = C.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.38, t + 3);
    g.gain.setValueAtTime(0.38, t + dur - 3.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const trem = C.createGain(); // slow tremolo so the chord breathes
    trem.gain.value = 0.9;
    const lfo = C.createOscillator();
    lfo.frequency.value = 0.18 + Math.random() * 0.1;
    const lg = C.createGain();
    lg.gain.value = 0.1;
    lfo.connect(lg);
    lg.connect(trem.gain);
    const lp = C.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1700;
    lp.Q.value = 0.7;
    const vowel = C.createBiquadFilter(); // a soft "aah"
    vowel.type = 'peaking';
    vowel.frequency.value = 800;
    vowel.gain.value = 6;
    vowel.Q.value = 2;
    lp.connect(vowel);
    vowel.connect(trem);
    trem.connect(g);
    [-7, 0, 7].forEach((cents) => {
      const o = C.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      const og = C.createGain();
      og.gain.value = 0.11;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
    const o2 = C.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    const g2 = C.createGain();
    g2.gain.value = 0.1;
    o2.connect(g2);
    g2.connect(lp);
    o2.start(t);
    o2.stop(t + dur + 0.1);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
    route(g, 3, 0.6, (Math.random() - 0.5) * 0.6);
  });
}

/** One bar (8 beats) of flute: a short phrase that wanders the scale and lands on a resting note. */
function fluteBar(t, dense) {
  if (Math.random() < (dense ? 0.1 : 0.3)) return; // sometimes the flute rests a whole bar
  let pos = Math.random() < 0.5 ? 0 : 1;
  const n = 3 + Math.floor(Math.random() * 3) + (dense ? 1 : 0);
  let prev = null;
  for (let i = 0; i < n && pos < 7.5; i++) {
    fi = Math.max(0, Math.min(FLUTE.length - 1, fi + pick([-2, -1, -1, 0, 1, 1, 2])));
    if (i === n - 1) fi = pick([0, 1, 4]); // land on E4, G4 or D5
    const d = Math.min(pick([1, 1, 1.5, 2, 3]), 8 - pos - 0.25);
    if (d < 0.5) break;
    const f = hz(FLUTE[fi]);
    flute(f, t + pos * BEAT, d * BEAT * 0.95, 0.62, prev);
    prev = f;
    pos += d + (Math.random() < 0.3 ? 0.5 : 0);
  }
}

function playBeat(b, t) {
  const on = (i) => level > i;
  if (on(0)) {
    const strings = [hz(7), hz(12), hz(12), hz(0)]; // Pa, Sa, Sa, low Sa
    if (b % 8 !== 7) pluck(strings[b % 4], t, b % 4 === 3 ? 0.5 : 0.38);
    if (b % 8 === 0 && Math.random() < 0.6) bell(hz(36 + pick(PENTA)), t + 0.3, 0.075, 0, (Math.random() - 0.5) * 0.8);
  }
  if (on(1) && b % 8 === 0) fluteBar(t, on(4));
  if (on(2)) {
    const s = (b % 8) * 2;
    [s, s + 1].forEach((step, k) => {
      const tt = t + k * (BEAT / 2);
      if (GE.includes(step)) madal('ge', tt, step === 0 ? 0.55 : 0.42);
      else if (TA.includes(step)) madal('ta', tt, 0.38);
      else if (GHOST.includes(step)) madal('ghost', tt, 0.12);
    });
  }
  if (on(3) && b % 16 === 0) pad(CHORDS[((b / 16) | 0) % 4], t, 15 * BEAT);
  if (on(4) && Math.random() < 0.4) {
    bell(hz(36 + pick(PENTA) + (Math.random() < 0.3 ? 12 : 0)), t + Math.random() * 0.4, 0.09, 4, (Math.random() - 0.5) * 1.2);
  }
}

function schedule(until) {
  while (nextT < until) {
    playBeat(beat, nextT);
    beat++;
    nextT += BEAT;
  }
}

export const Music = {
  attach(ctx, destination, reverbIn) {
    C = ctx;
    bus = destination;
    rev = reverbIn;
    const sr = C.sampleRate;
    noiseBuf = C.createBuffer(1, sr * 2, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (let i = 0; i < LAYERS; i++) {
      const a = C.createGain();
      a.gain.value = 0;
      a.connect(bus);
      dry[i] = a;
      const w = C.createGain();
      w.gain.value = 0;
      w.connect(rev);
      wet[i] = w;
    }
    this.setLevel(level, true);
  },
  /** How many layers are audible (0-5). Layers fade in and out over a few seconds. */
  setLevel(n, instant = false) {
    level = n;
    if (!C) return;
    const now = C.currentTime;
    for (let i = 0; i < LAYERS; i++) {
      const target = i < n ? LAYER_VOL[i] : 0;
      [dry[i], wet[i]].forEach((g) => {
        g.gain.cancelScheduledValues(now);
        if (instant) g.gain.setValueAtTime(target, now);
        else g.gain.setTargetAtTime(target, now, 1.4);
      });
    }
    if (track) {
      // one recording instead of layers: it gets louder and brighter as the wicks are lit (muffled and quiet on the title)
      const k = Math.max(0, Math.min(1, (n - 1) / 4));
      const vol = n <= 0 ? 0 : TRACK_VOL * (0.72 + 0.28 * k);
      const cutoff = n <= 0 ? 600 : 2600 * 8 ** k; // 2.6 kHz at the first wick, wide open at the fifth
      [[track.gain.gain, vol], [track.filter.frequency, cutoff]].forEach(([p, v]) => {
        p.cancelScheduledValues(now);
        if (instant) p.setValueAtTime(v, now);
        else p.setTargetAtTime(v, now, 1.4);
      });
    }
  },
  start() {
    if (!C || timer || !generative) return;
    nextT = C.currentTime + 0.2;
    beat = 0;
    timer = makeTicker(() => schedule(C.currentTime + 1.5), 120);
  },
  stop() {
    timer?.stop();
    timer = null;
  },
  /** Real recordings: five loops of the same length replace the generated score. */
  useStems(buffers) {
    if (!C) return;
    generative = false;
    this.stop();
    stemSrc.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    const t = C.currentTime + 0.1;
    stemSrc = buffers.slice(0, LAYERS).map((b, i) => {
      const s = C.createBufferSource();
      s.buffer = b;
      s.loop = true;
      s.connect(dry[i]);
      s.start(t);
      return s;
    });
  },
  /** One finished recording (any length, looped) replaces the generated score. */
  useTrack(buffer) {
    if (!C) return;
    generative = false;
    this.stop();
    stemSrc.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    stemSrc = [];
    if (track) {
      try {
        track.src.stop();
      } catch {
        /* already stopped */
      }
    }
    const src = C.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = C.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.4;
    const gain = C.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    track = { src, filter, gain };
    src.start(C.currentTime + 0.1);
    this.setLevel(level, true);
  },
  /** What is playing: 'track' (one recording), 'stems' (five loops) or 'generated' (the built-in score). For tests and debugging. */
  mode() {
    if (track) return 'track';
    return generative ? 'generated' : 'stems';
  },
  /** Current volume and filter of the single recording, or null (tests and debugging). */
  trackState() {
    return track ? { gain: track.gain.gain.value, cutoff: track.filter.frequency.value } : null;
  },
  /** Offline rendering (tests): schedule `seconds` of music from time 0. */
  plan(seconds) {
    nextT = 0;
    beat = 0;
    schedule(seconds);
  },
};
