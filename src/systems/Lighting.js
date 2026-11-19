import Phaser from 'phaser';
import { W, H } from '../config.js';
import { Quality } from './quality.js';

/**
 * The dark overlay. Everything is covered by a night-coloured layer; every light
 * punches a soft radial hole in it. The diya's light is the only way to see.
 * It is drawn at half resolution (a third on low quality) and scaled up: the light is soft anyway,
 * and it is the biggest full-screen layer in the game.
 */
export class Lighting {
  constructor(scene, { depth = 800, color = 0x0b0919, ambient = 0 } = {}) {
    this.scene = scene;
    this.color = color;
    this.ambient = ambient; // 0 = fully lit, 1 = pitch dark
    this.lights = [];
    const res = Quality.pick(0.5, 0.34);
    this.rt = scene.add.renderTexture(0, 0, Math.ceil(W * res), Math.ceil(H * res)).setOrigin(0, 0).setDepth(depth);
    this.fit();
    this.stamp = scene.make.image({ key: 'light', add: false }).setOrigin(0.5);
    this.offQuality = Quality.onChange(() => this.setRes(Quality.pick(0.5, 0.34)));
    scene.events.once('shutdown', () => this.destroy());
  }

  fit() {
    this.rt.setScale(W / this.rt.width, H / this.rt.height);
  }

  setRes(res) {
    try {
      this.rt.resize(Math.ceil(W * res), Math.ceil(H * res));
      this.fit();
    } catch {
      /* keep the current size */
    }
  }

  add(light) {
    // light = { x, y, radius, flicker? }
    light.flicker = light.flicker ?? 0.04;
    light.seed = Math.random() * 100;
    this.lights.push(light);
    return light;
  }

  remove(light) {
    const i = this.lights.indexOf(light);
    if (i >= 0) this.lights.splice(i, 1);
  }

  update(time) {
    const rt = this.rt;
    if (!this.stamp) return;
    const rx = rt.width / W;
    const ry = rt.height / H;
    rt.clear();
    if (this.ambient > 0.002) rt.fill(this.color, this.ambient);
    for (const l of this.lights) {
      if (l.radius <= 1) continue;
      const f = 1 + (Math.sin(time * 0.017 + l.seed) * 0.5 + Math.sin(time * 0.041 + l.seed * 2) * 0.5) * l.flicker;
      this.stamp.setScale(((l.radius * f * 2) / 512) * rx, ((l.radius * f * 2) / 512) * ry);
      rt.erase(this.stamp, l.x * rx, l.y * ry);
    }
  }

  destroy() {
    this.offQuality?.();
    this.lights.length = 0;
    this.stamp?.destroy();
    this.stamp = null;
  }
}
