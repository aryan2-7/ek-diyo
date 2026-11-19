// Player settings (progress lives in state.js). Saved in localStorage; a few can be forced from the URL for testing.
//   ?quality=low|high   force a quality level for this visit      ?unlock   open every night      ?lang=ne|en
const KEY = 'five-nights.settings.v1';
const defaults = { fullscreen: true, music: 0.6, sfx: 0.9, quality: 'high', reduceMotion: false, unlockAll: false, lang: 'en' };

const params = new URLSearchParams(location.search);

// URL overrides last for the visit only and are never written to storage
export const override = {
  quality: ['low', 'high'].includes(params.get('quality')) ? params.get('quality') : null,
};

function load() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    /* private mode etc. - settings just won't persist */
  }
  const s = { ...defaults, ...saved };
  if (saved.reduceMotion === undefined && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) s.reduceMotion = true;
  if (params.has('unlock')) s.unlockAll = true;
  if (params.has('debug') || params.has('nofull')) s.fullscreen = false; // tests and screenshots stay windowed
  const lang = params.get('lang');
  if (lang === 'ne' || lang === 'en') s.lang = lang;
  return s;
}

export const settings = load();

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
