import Phaser from 'phaser';
import { Sfx } from './sfx.js';

/** One paper-cut flame with code-driven flicker and a warm additive glow. */
export class Flame {
  constructor(scene, x, y, { size = 50, depth = 760, glow = true } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.size = size;
    this.phase = Math.random() * 100;
    this.img = scene.add.image(x, y, 'flame').setOrigin(0.5, 1).setDepth(depth);
    this.glow = glow
      ? scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(depth - 1)
      : null;
    this.update(0);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  setSize(s) {
    this.size = s;
    return this;
  }

  setVisible(v) {
    this.img.setVisible(v);
    this.glow?.setVisible(v);
    return this;
  }

  setDepth(d) {
    this.img.setDepth(d);
    this.glow?.setDepth(d - 1);
    return this;
  }

  update(t) {
    const p = this.phase;
    const f = 1 + Math.sin(t * 0.021 + p) * 0.08 + Math.sin(t * 0.047 + p * 2) * 0.06 + Math.sin(t * 0.11 + p * 3) * 0.03;
    const sway = Math.sin(t * 0.013 + p) * 0.07;
    const base = this.size / 144;
    this.img.setPosition(this.x + sway * this.size * 0.25, this.y);
    this.img.setScale(base * (2 - f) * 0.95, base * f);
    this.img.setRotation(sway);
    if (this.glow) {
      this.glow.setPosition(this.x, this.y - this.size * 0.35);
      this.glow.setScale((this.size * 4.2 * f) / 256);
      this.glow.setAlpha(0.5 + (f - 1) * 1.2);
    }
  }

  destroy() {
    this.img.destroy();
    this.glow?.destroy();
  }
}

// Where extra wicks sit on the diya rim (fractions of the sprite's width/height from its top-left).
// Slot 0 is the wick already drawn in the diya art.
const SLOTS = [
  { x: 0.96, y: 0.03, own: true },
  { x: 0.2, y: 0.2, rot: -0.35 },
  { x: 0.45, y: 0.11, rot: -0.1 },
  { x: 0.66, y: 0.12, rot: 0.15 },
  { x: 0.32, y: 0.14, rot: -0.22 },
];

// The five-wick lamp (five_diya.webp) already has all five wicks drawn; each slot is where a wick tip is
// (fractions of the sprite). They light centre first, then inner pair, then outer pair.
export const SLOTS_FIVE = [
  { x: 0.503, y: 0.486, own: true },
  { x: 0.165, y: 0.503, own: true },
  { x: 0.826, y: 0.503, own: true },
  { x: 0.022, y: 0.455, own: true },
  { x: 0.974, y: 0.442, own: true },
];

/**
 * A diya sprite with 0-5 lit wicks. Used for the floating diya on Night 2 (the five-wick art, lit wicks
 * at a lower count) and, with texture 'five_diya', for the story-card progression and the ending.
 */
export class DiyaRig {
  constructor(scene, x, y, { width = 200, wicks = 1, depth = 60, texture = 'diya' } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.depth = depth;
    this.five = texture === 'five_diya';
    this.slotDefs = this.five ? SLOTS_FIVE : SLOTS;
    this.img = scene.add.image(x, y, texture).setDepth(depth);
    this.k = width / this.img.width;
    this.img.setScale(this.k);
    this.slots = []; // { wick, flame }
    this.count = 0;
    this.setWicks(wicks);
  }

  get width() {
    return this.img.displayWidth;
  }

  _pos(i) {
    const s = this.slotDefs[i];
    return { x: this.x + (s.x - 0.5) * this.img.displayWidth, y: this.y + (s.y - 0.5) * this.img.displayHeight };
  }

  _make(i) {
    const s = this.slotDefs[i];
    const p = this._pos(i);
    let wick = null;
    let rise = 0;
    if (!s.own) {
      wick = this.scene.add.image(p.x, p.y, 'wick').setOrigin(0.5, 1).setRotation(s.rot).setDepth(this.depth + 1);
      wick.setScale(this.k * 1.9);
      rise = wick.displayHeight * 0.92;
    }
    const size = this.img.displayWidth * (this.five ? 0.17 : 0.34);
    const flame = new Flame(this.scene, p.x, p.y - rise, { size, depth: this.depth + 3 });
    return { wick, flame, rise };
  }

  setWicks(n) {
    while (this.count < n) {
      this.slots.push(this._make(this.count));
      this.count++;
    }
    return this;
  }

  /** Light one more wick with a little pop. */
  addWick() {
    const i = this.count;
    if (i >= this.slotDefs.length) return;
    const slot = this._make(i);
    this.slots.push(slot);
    this.count++;
    const target = slot.flame.size;
    slot.flame.setSize(0);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 600,
      ease: 'Back.easeOut',
      onUpdate: (tw) => slot.flame.setSize(target * tw.getValue()),
    });
    if (slot.wick) {
      slot.wick.setAlpha(0);
      this.scene.tweens.add({ targets: slot.wick, alpha: 1, duration: 250 });
    }
    Sfx.chime();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.img.setPosition(x, y);
    this.slots.forEach((s, i) => {
      const p = this._pos(i);
      s.wick?.setPosition(p.x, p.y);
      s.flame.setPosition(p.x, p.y - s.rise);
    });
    return this;
  }

  /** Centre of the flames - put the light here. */
  lightPoint() {
    if (!this.slots.length) return { x: this.x, y: this.y };
    let x = 0;
    let y = 0;
    this.slots.forEach((s) => {
      x += s.flame.x;
      y += s.flame.y - s.flame.size * 0.5;
    });
    return { x: x / this.slots.length, y: y / this.slots.length };
  }

  update(t) {
    this.slots.forEach((s) => s.flame.update(t));
  }

  setVisible(v) {
    this.img.setVisible(v);
    this.slots.forEach((s) => {
      s.wick?.setVisible(v);
      s.flame.setVisible(v);
    });
  }

  destroy() {
    this.img.destroy();
    this.slots.forEach((s) => {
      s.wick?.destroy();
      s.flame.destroy();
    });
    this.slots.length = 0;
  }
}

/** The Keeper's diya flames: one per wick (Night n carries n wicks). */
export class FlameCluster {
  constructor(scene, count = 1, { size = 50, depth = 760, spread = 0.3, glow = true } = {}) {
    this.scene = scene;
    this.size = size;
    this.spread = spread;
    this.depth = depth;
    this.x = 0;
    this.y = 0;
    this.flames = [];
    this.wicks = [];
    for (let i = 0; i < count; i++) {
      this.flames.push(new Flame(scene, 0, 0, { size: i === 0 ? size : size * 0.82, depth, glow }));
      const wick = scene.add.image(0, 0, 'wick').setOrigin(0.5, 1).setDepth(depth - 1);
      this.wicks.push(wick);
    }
  }

  offset(i) {
    if (i === 0) return { x: 0, y: 0 };
    const k = Math.ceil(i / 2);
    return { x: (i % 2 ? -1 : 1) * k * this.size * this.spread, y: k * this.size * 0.07 };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  setSize(s) {
    this.size = s;
    this.flames.forEach((f, i) => f.setSize(i === 0 ? s : s * 0.82));
    return this;
  }

  setVisible(v) {
    this.flames.forEach((f) => f.setVisible(v));
    this.wicks.forEach((w) => w.setVisible(v));
  }

  update(t) {
    this.flames.forEach((f, i) => {
      const o = this.offset(i);
      const fx = this.x + o.x;
      const fy = this.y + o.y;
      f.setPosition(fx, fy);
      f.update(t);
      const w = this.wicks[i];
      if (w) {
        const s = i === 0 ? this.size : this.size * 0.82;
        w.setPosition(fx, fy).setScale(s * 0.015).setDepth(this.depth - 1);
      }
    });
  }

  destroy() {
    this.flames.forEach((f) => f.destroy());
    this.wicks.forEach((w) => w.destroy());
  }
}
