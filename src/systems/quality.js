// Quality levels: 'high' (bloom + colour grade, full particles) and 'low' (none of the full-screen effects).
// 'auto' starts high (low on weak phones) and drops to low by itself if the frame rate stays poor.
import { settings, override } from './settings.js';

const weakDevice = () => {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return mobile && (cores <= 4 || mem <= 3);
};

let autoLow = false;
try {
  autoLow = sessionStorage.getItem('ek-diyo.autolow') === '1' || sessionStorage.getItem('five-nights.autolow') === '1';
} catch {
  /* ignore */
}

const listeners = new Set();

export const Quality = {
  level: 'high',
  get low() {
    return this.level === 'low';
  },
  pick(high, low) {
    return this.low ? low : high;
  },
  /** (Re)read the setting. Call again after the player changes it. */
  init() {
    const want = override.quality || (settings.quality === 'auto' ? null : settings.quality);
    this.set(want || (autoLow || weakDevice() ? 'low' : 'high'));
  },
  set(level, auto = false) {
    if (level === this.level) return;
    this.level = level;
    if (auto) {
      autoLow = true;
      try {
        sessionStorage.setItem('ek-diyo.autolow', '1');
      } catch {
        /* ignore */
      }
    }
    listeners.forEach((fn) => fn(level));
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Call once per scene: if the frame rate stays under ~38 fps for a few seconds, switch to low. */
  watch(scene) {
    if (override.quality || settings.quality !== 'auto') return;
    let warm = 0;
    let bad = 0;
    scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.low) return;
        if (++warm < 5) return; // ignore the first seconds (loading, fade-in)
        bad = scene.game.loop.actualFps < 38 ? bad + 1 : 0;
        if (bad >= 4) this.set('low', true);
      },
    });
  },
};

Quality.init();
