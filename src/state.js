// Tiny save system: which nights are unlocked, best results, mute setting.
const KEY = 'five-nights.v1';
const defaults = { unlocked: 1, best: {}, muted: false };

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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

export function completeNight(n, stats = {}) {
  state.unlocked = Math.max(state.unlocked, Math.min(n + 1, 5));
  state.best[n] = { ...(state.best[n] || {}), ...stats };
  save();
}
