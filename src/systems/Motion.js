import Phaser from 'phaser';
import { W, H } from '../config.js';
import { Quality } from './quality.js';
import { settings } from './settings.js';

/**
 * Hand-made motion. Characters update in steps (like stop-motion paper puppets) instead of at a smooth 60 fps;
 * this hides the lack of in-between frames and reads as deliberate. All of it is code, no extra art.
 */
export const snap = (t, fps = 10) => Math.floor((t / 1000) * fps) * (1000 / fps);

/** Deterministic stepped noise in -1..1: the same value for a whole step, a new one on the next. */
export function stepNoise(t, seed = 0, fps = 10) {
  const n = Math.floor((t / 1000) * fps) + seed * 13.7;
  return Math.sin(n * 12.9898) * 0.5 + Math.sin(n * 78.233) * 0.5;
}

/**
 * Scene finish: a warm colour grade, a soft bloom on the lights (desktop, high quality only) and drifting
 * dust motes and marigold petals under the dark layer, so they only show inside the diya's light.
 * Everything is optional: without WebGL, or on low quality, the scene simply has no grade.
 * Also starts the frame-rate watch that drops to low quality by itself on a struggling device.
 */
export function finish(scene, { petals = true, motes = true } = {}) {
  const cam = scene.cameras.main;
  const webgl = scene.sys.game.renderer.type === Phaser.WEBGL;
  const applyFx = () => {
    if (!webgl) return;
    try {
      cam.postFX.clear();
      if (Quality.low) return;
      const cm = cam.postFX.addColorMatrix();
      cm.saturate(0.12);
      cm.contrast(0.06);
      if (scene.sys.game.device.os.desktop && !settings.reduceMotion) cam.postFX.addBloom(0xffffff, 1, 1, 0.6, 0.11, 4);
    } catch {
      /* effects are a bonus, never a blocker */
    }
  };
  applyFx();
  const emitters = [];
  if (motes) {
    emitters.push(
      scene.add
        .particles(0, 0, 'ember', {
          x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: { min: 4500, max: 8000 },
          speedX: { min: -14, max: 14 }, speedY: { min: -22, max: -6 }, scale: { start: 0.55, end: 0 },
          alpha: { start: 0.55, end: 0 }, blendMode: 'ADD', frequency: Quality.pick(240, 480),
        })
        .setDepth(700),
    );
  }
  if (petals) {
    emitters.push(
      scene.add
        .particles(0, 0, 'petal', {
          x: { min: -60, max: W }, y: -24, lifespan: 11000, speedX: { min: 8, max: 46 }, speedY: { min: 22, max: 58 },
          rotate: { start: 0, end: 360 }, scale: { min: 0.55, max: 1.05 }, alpha: 0.9,
          frequency: Quality.pick(1100, 2200) * (settings.reduceMotion ? 2 : 1), tint: [0xf2a33a, 0xc8432b, 0xe8c44b],
        })
        .setDepth(705),
    );
  }
  const off = Quality.onChange(() => {
    applyFx();
    emitters.forEach((e) => e.setFrequency(e.frequency * 2, e.quantity));
  });
  scene.events.once('shutdown', off);
  Quality.watch(scene);
}
