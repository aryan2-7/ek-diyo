import Phaser from 'phaser';
import { W, H } from '../config.js';

/**
 * The dark overlay. Everything is covered by a night-coloured layer; every light
 * punches a soft radial hole in it. The diya's light is the only way to see.
 */
export class Lighting {
  constructor(scene, { depth = 800, color = 0x0b0919, ambient = 0 } = {}) {
    this.scene = scene;
    this.color = color;
    this.ambient = ambient; // 0 = fully lit, 1 = pitch dark
    this.lights = [];
    this.rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(depth);
    this.stamp = scene.make.image({ key: 'light', add: false }).setOrigin(0.5);
    scene.events.once('shutdown', () => this.destroy());
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
    rt.clear();
    if (this.ambient > 0.002) rt.fill(this.color, this.ambient);
    for (const l of this.lights) {
      if (l.radius <= 1) continue;
      const f = 1 + (Math.sin(time * 0.017 + l.seed) * 0.5 + Math.sin(time * 0.041 + l.seed * 2) * 0.5) * l.flicker;
      this.stamp.setScale((l.radius * f * 2) / 512);
      rt.erase(this.stamp, l.x, l.y);
    }
  }

  destroy() {
    this.lights.length = 0;
    this.stamp?.destroy();
    this.stamp = null;
  }
}
