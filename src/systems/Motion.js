import Phaser from 'phaser';
import { W, H } from '../config.js';

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
 * Scene finish: a warm colour grade, a soft bloom on the lights (desktop only) and drifting
 * dust motes and marigold petals under the dark layer, so they only show inside the diya's light.
 * Everything is optional: without WebGL the scene simply has no grade.
 */
export function finish(scene, { petals = true, motes = true } = {}) {
  const cam = scene.cameras.main;
  if (scene.sys.game.renderer.type === Phaser.WEBGL) {
    try {
      const cm = cam.postFX.addColorMatrix();
      cm.saturate(0.12);
      cm.contrast(0.06);
      if (scene.sys.game.device.os.desktop) cam.postFX.addBloom(0xffffff, 1, 1, 1.1, 0.55, 4);
    } catch {
      /* effects are a bonus, never a blocker */
    }
  }
  if (motes) {
    scene.add
      .particles(0, 0, 'ember', {
        x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: { min: 4500, max: 8000 },
        speedX: { min: -14, max: 14 }, speedY: { min: -22, max: -6 }, scale: { start: 0.55, end: 0 },
        alpha: { start: 0.55, end: 0 }, blendMode: 'ADD', frequency: 240,
      })
      .setDepth(700);
  }
  if (petals) {
    scene.add
      .particles(0, 0, 'petal', {
        x: { min: -60, max: W }, y: -24, lifespan: 11000, speedX: { min: 8, max: 46 }, speedY: { min: 22, max: 58 },
        rotate: { start: 0, end: 360 }, scale: { min: 0.55, max: 1.05 }, alpha: 0.9, frequency: 1100,
        tint: [0xf2a33a, 0xc8432b, 0xe8c44b],
      })
      .setDepth(705);
  }
}
