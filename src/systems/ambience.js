import Phaser from 'phaser';
import { W, H } from '../config.js';
import { settings } from './settings.js';
import { Quality } from './quality.js';

// Small touches of life, all drawn in code: they cost no art and respect "reduce motion" / low quality.

/** A soft warm flicker over windows that are already painted lit in the art. spots: [x, y, w, h] in screen pixels. */
export function windowGlows(scene, spots, { depth = 5, color = 0xffb040 } = {}) {
  if (settings.reduceMotion) return [];
  return spots.map(([x, y, w, h], i) => {
    const g = scene.add
      .image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setDepth(depth)
      .setScale((Math.max(w, h) * 4.2) / 256)
      .setAlpha(0.3);
    scene.tweens.add({
      targets: g, alpha: { from: 0.18, to: 0.55 }, duration: Phaser.Math.Between(700, 1700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 230,
    });
    return g;
  });
}

function birdTexture(scene) {
  if (scene.textures.exists('bird')) return;
  const tex = scene.textures.createCanvas('bird', 48, 24);
  const ctx = tex.getContext();
  ctx.strokeStyle = '#1a1714';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(3, 17);
  ctx.quadraticCurveTo(14, 1, 24, 14);
  ctx.quadraticCurveTo(34, 1, 45, 17);
  ctx.stroke();
  tex.refresh();
}

/** Now and then a few birds cross the sky. */
export function birds(scene, { y = [50, 200], gap = [7000, 15000], depth = 3, alpha = 0.7 } = {}) {
  if (settings.reduceMotion) return;
  birdTexture(scene);
  const flock = () => {
    const n = Phaser.Math.Between(2, 4);
    const fromLeft = Math.random() < 0.5;
    const y0 = Phaser.Math.Between(y[0], y[1]);
    const dur = Phaser.Math.Between(13000, 19000);
    for (let i = 0; i < n; i++) {
      const b = scene.add.image(fromLeft ? -60 - i * 46 : W + 60 + i * 46, y0 + i * 14, 'bird').setDepth(depth).setAlpha(alpha);
      b.setScale(Phaser.Math.FloatBetween(0.6, 0.95)).setFlipX(!fromLeft);
      const base = b.y;
      const seed = Math.random() * 6;
      scene.tweens.add({
        targets: b, x: fromLeft ? W + 80 : -80, duration: dur, ease: 'Linear',
        onUpdate: () => {
          const t = scene.time.now;
          b.y = base + Math.sin(t * 0.0012 + seed) * 18;
          b.scaleY = Math.abs(b.scaleX) * (0.55 + 0.45 * Math.abs(Math.sin(Math.floor(t / 90) * 0.9 + seed))); // stepped wingbeat
        },
        onComplete: () => b.destroy(),
      });
    }
    scene.time.delayedCall(Phaser.Math.Between(gap[0], gap[1]), flock);
  };
  scene.time.delayedCall(Phaser.Math.Between(2500, 6000), flock);
}

/** Slow warm lights drifting in the dark. */
export function fireflies(scene, { count = 14, area = [0, 300, W, 400], depth = 720, color = 0xffe08a } = {}) {
  if (settings.reduceMotion) return;
  const n = Quality.low ? Math.ceil(count / 2) : count;
  for (let i = 0; i < n; i++) {
    const x = Phaser.Math.Between(area[0], area[0] + area[2]);
    const y = Phaser.Math.Between(area[1], area[1] + area[3]);
    const f = scene.add.image(x, y, 'ember').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setDepth(depth).setScale(Phaser.Math.FloatBetween(0.7, 1.3)).setAlpha(0);
    scene.tweens.add({ targets: f, x: x + Phaser.Math.Between(-90, 90), y: y + Phaser.Math.Between(-60, 40), duration: Phaser.Math.Between(4500, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 300 });
    scene.tweens.add({ targets: f, alpha: { from: 0, to: Phaser.Math.FloatBetween(0.5, 0.95) }, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 180 });
  }
}

/** Layers shift a little with the pointer: amt is how far (px) the layer moves at the screen edge (negative = the other way). */
export function parallax(scene, layers) {
  if (settings.reduceMotion) return;
  const base = layers.map((l) => ({ x: l.obj.x, y: l.obj.y }));
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  const move = (p) => {
    tx = (p.worldX / W - 0.5) * 2;
    ty = (p.worldY / H - 0.5) * 2;
  };
  const upd = () => {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    layers.forEach((l, i) => l.obj.setPosition(base[i].x - cx * l.amt, base[i].y - cy * l.amt * 0.6));
  };
  scene.input.on('pointermove', move);
  scene.events.on('update', upd);
  scene.events.once('shutdown', () => {
    scene.events.off('update', upd);
    scene.input.off('pointermove', move);
  });
}
