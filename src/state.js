// Tiny save system: which nights are unlocked, best results, mute setting.
const KEY = 'ek-diyo.v1';
const OLD_KEY = 'five-nights.v1';
const defaults = { unlocked: 1, best: {}, muted: false };

function load() {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    // sound is always ON at the start of a visit (M mutes for the session), even if it was muted last time
    return { ...defaults, ...JSON.parse(raw || '{}'), muted: false };
  } catch {
    return { ...defaults };
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ unlocked: state.unlocked, best: state.best, muted: state.muted }));
  } catch {
    /* private mode etc. - progress just won't persist */
  }
}

// stats where a bigger number is better / a smaller number is better
const MORE_IS_BETTER = ['crows', 'garlands', 'sparks', 'offerings', 'spare', 'pct'];
const LESS_IS_BETTER = ['splats', 'mistakes'];

export function completeNight(n, stats = {}) {
  state.unlocked = Math.max(state.unlocked, Math.min(n + 1, 5));
  const prev = state.best[n] || {};
  const best = { ...prev };
  for (const [k, v] of Object.entries(stats)) {
    if (!(k in prev)) best[k] = v;
    else if (MORE_IS_BETTER.includes(k)) best[k] = Math.max(prev[k], v);
    else if (LESS_IS_BETTER.includes(k)) best[k] = Math.min(prev[k], v);
    else best[k] = v;
  }
  state.best[n] = best;
  save();
}

/** One-line summary of a night's best result, or '' if it has not been completed. */
export function bestLine(n) {
  const b = state.best[n];
  if (!b) return '';
  const parts = {
    1: () => `${b.crows} crows fed`,
    2: () => `${b.garlands} garlands`,
    3: () => `${b.sparks} sparks`,
    4: () => `${b.offerings} offerings, ${b.splats} ${b.splats === 1 ? 'splat' : 'splats'}`,
    5: () => (b.mistakes === undefined ? 'tika complete' : `tika complete, ${b.mistakes} ${b.mistakes === 1 ? 'slip' : 'slips'}`),
  };
  return parts[n] ? parts[n]() : '';
}

/** Start over: lock the nights again and forget the best results. */
export function resetProgress() {
  state.unlocked = 1;
  state.best = {};
  save();
}

/** 0 = not finished, otherwise 1-3 flames for how well the best run went. */
export function rating(n) {
  const b = state.best[n];
  if (!b) return 0;
  const by = (v, hi, mid) => (v >= hi ? 3 : v >= mid ? 2 : 1);
  switch (n) {
    case 1: return b.spare === undefined ? 1 : by(b.spare, 16, 8); // dusk to spare (of 45 s)
    case 2: return b.pct === undefined ? 1 : by(b.pct, 80, 50); // share of garlands gathered
    case 3: return b.sparks === undefined ? 1 : by(b.sparks, 4, 2);
    case 4: return b.splats === undefined ? 1 : b.splats === 0 ? 3 : b.splats <= 2 ? 2 : 1;
    case 5: return b.mistakes === undefined ? 1 : b.mistakes === 0 ? 3 : b.mistakes <= 1 ? 2 : 1;
    default: return 1;
  }
}
