import { W, H } from '../config.js';
import { Quality } from './quality.js';

// Render at the screen's own resolution, so text and icons stay sharp when the game is shown larger than 1280x720
// (fullscreen on a 1080p screen, retina laptops). The game still thinks in 1280x720 units: every camera is zoomed by Render.scale.
// A small window or low quality uses 1 (the old behaviour); 1.5 and 2 are used only when the screen can show the extra detail.
export const Render = {
  scale: 1,

  ideal() {
    const css = Math.min(innerWidth / W, innerHeight / H) * (window.devicePixelRatio || 1);
    const want = css < 1.15 ? 1 : css < 1.75 ? 1.5 : 2;
    const cap = (navigator.hardwareConcurrency || 4) >= 8 ? 2 : 1.5;
    return Quality.low ? Math.min(want, 1) : Math.min(want, cap);
  },

  init() {
    this.scale = this.ideal();
    return this.scale;
  },

  /** Once the game exists: keep the resolution right when the window, fullscreen or quality changes. */
  watch(game) {
    let timer = null;
    const apply = () => {
      const r = this.ideal();
      if (r === this.scale) return;
      this.scale = r;
      game.scale.setGameSize(W * r, H * r);
      game.scene.scenes.forEach((s) => {
        if (s.cameras?.main) s.cameras.main.setOrigin(0, 0).setZoom(r);
      });
    };
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 250);
    };
    window.addEventListener('resize', later);
    document.addEventListener('fullscreenchange', later);
    Quality.onChange(apply);
  },
};
