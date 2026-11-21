import Phaser from 'phaser';
import { FlameCluster } from './Flame.js';
import { snap, stepNoise } from './Motion.js';
import { Sfx } from './sfx.js';

const lerp = Phaser.Math.Linear;
// where the diya sits on each Keeper sprite (fractions of displayed width / height)
const FRONT = { fx: 0.47, fy: 0.405 };
const SIDE = { fx: 0.97, fy: 0.52 };

/**
 * The player character: the Keeper carrying the diya. Walks with arrow keys / WASD,
 * or toward wherever you tap / drag. Carries one flame per wick and lights the dark around him.
 */
export class Keeper {
  constructor(scene, lighting, o = {}) {
    const {
      x = 640, y = 620, top = 515, bottom = 692, left = () => 60, right = () => 1220,
      scale = [0.26, 0.36], speed = 340, lightRadius = 330, flameSize = 52, wicks = 1,
    } = o;
    Object.assign(this, { scene, x, y, top, bottom, left, right, scale, speed });
    this.dir = 1;
    this.moving = false;
    this.face = 'front';
    this.target = null;
    this.enabled = true;
    this.onFirstMove = null;
    this._moved = false;

    this.sprite = scene.add.image(0, 0, 'keeper').setOrigin(0.5, 1);
    this.held = scene.add.image(0, 0, 'diya').setVisible(false);
    this.flames = new FlameCluster(scene, wicks, { size: flameSize, depth: 760 });
    this.light = lighting ? lighting.add({ x: 0, y: 0, radius: lightRadius + (wicks - 1) * 35, flicker: 0.05 }) : null;
    this.embers = scene.add
      .particles(0, 0, 'ember', {
        lifespan: { min: 800, max: 1500 }, speedY: { min: -45, max: -95 }, speedX: { min: -18, max: 18 },
        scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 150,
      })
      .setDepth(770);
    this.embers.startFollow(this.flames, 0, -30);
    this.dust = scene.add
      .particles(0, 0, 'ember', {
        lifespan: 380, speedX: { min: -34, max: 34 }, speedY: { min: -26, max: -6 },
        scale: { start: 0.5, end: 0 }, alpha: { start: 0.4, end: 0 }, tint: 0xd9c9a0, emitting: false,
      })
      .setDepth(750);
    this._lastHop = 0;
    this._lastStep = 0;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    scene.input.on('pointerdown', (p, over) => {
      if (over && over.length) return; // a tap on a button or HUD icon should not move him
      if (this.enabled) this.target = { x: p.worldX, y: p.worldY };
    });
    scene.input.on('pointermove', (p) => {
      if (p.isDown && this.enabled) this.target = { x: p.worldX, y: p.worldY };
    });
  }

  depthT(y) {
    return Phaser.Math.Clamp((y - this.top) / (this.bottom - this.top), 0, 1);
  }

  /** Height of the displayed sprite at the current position (handy for placing things on him). */
  get displayHeight() {
    return this.sprite.displayHeight;
  }

  update(time, dt) {
    let vx = 0;
    let vy = 0;
    if (this.enabled) {
      const c = this.cursors;
      const w = this.wasd;
      if (c.left.isDown || w.A.isDown) vx -= 1;
      if (c.right.isDown || w.D.isDown) vx += 1;
      if (c.up.isDown || w.W.isDown) vy -= 1;
      if (c.down.isDown || w.S.isDown) vy += 1;
      if (vx || vy) this.target = null;
      else if (this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) this.target = null;
        else {
          const s = Math.min(1, d / 70);
          vx = (dx / d) * s;
          vy = (dy / d) * s;
        }
      }
    } else this.target = null;

    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    this.x += vx * this.speed * dt;
    this.y += vy * this.speed * 0.62 * dt;
    this.y = Phaser.Math.Clamp(this.y, this.top, this.bottom);
    this.x = Phaser.Math.Clamp(this.x, this.left(this.y), this.right(this.y));
    this.moving = len > 0.05;
    if (Math.abs(vx) > 0.2) this.dir = vx > 0 ? 1 : -1;
    this.face = Math.abs(vx) > 0.2 ? 'side' : 'front';
    if (this.moving && !this._moved) {
      this._moved = true;
      this.onFirstMove?.();
    }
    this.draw(time);
  }

  draw(time) {
    const spr = this.sprite;
    const sc = lerp(this.scale[0], this.scale[1], this.depthT(this.y));
    spr.setTexture(this.face === 'side' ? 'keeper_side' : 'keeper');
    const idleSq = 0.012 * Math.sin(time * 0.003);
    const ts = snap(time, 12);
    const walkSq = this.moving ? Math.abs(Math.sin(ts * 0.0094)) * 0.035 : 0;
    const hop = this.moving ? Math.abs(Math.sin(ts * 0.0094)) * 7 : 0;
    if (this.moving && this._lastHop > 3.5 && hop <= 3.5 && time - this._lastStep > 170) {
      this._lastStep = time; // a foot comes down: soft thud and a puff of dust
      Sfx.step();
      this.dust.explode(2, this.x - this.dir * 8, this.y - 2);
    }
    this._lastHop = hop;
    spr.setRotation(this.moving ? stepNoise(time, 1, 12) * 0.035 : 0);
    spr.setScale(sc * (1 - idleSq - walkSq), sc * (1 + idleSq + walkSq));
    spr.setFlipX(this.face === 'side' && this.dir < 0);
    spr.setPosition(this.x, this.y - hop).setDepth(this.y);
    const dw = spr.displayWidth;
    const dh = spr.displayHeight;
    let fx;
    let fy;
    if (this.face === 'front') {
      this.held.setVisible(false);
      fx = this.x + (FRONT.fx - 0.5) * dw;
      fy = this.y - hop - dh * (1 - FRONT.fy);
    } else {
      const cx = this.x + this.dir * (SIDE.fx - 0.5) * dw;
      const cy = this.y - hop - dh * (1 - SIDE.fy);
      this.held.setVisible(true).setPosition(cx, cy).setDepth(this.y + 1);
      this.held.setScale((dh * 0.22) / this.held.width).setFlipX(this.dir < 0);
      fx = cx + this.dir * this.held.displayWidth * 0.46;
      fy = cy - this.held.displayHeight * 0.47;
    }
    this.flames.setSize(dh * 0.15); // was 0.2: the flame covered his face
    this.flames.setPosition(fx, fy);
    this.flames.update(time);
    if (this.light) {
      this.light.x = fx;
      this.light.y = fy - 24;
    }
  }
}
