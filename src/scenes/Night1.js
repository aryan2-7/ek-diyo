import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { Keeper } from '../systems/Keeper.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, button, banner, hintPill, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys } from '../ui/ui.js';

// ---- tuning -------------------------------------------------------------
const DURATION = 85; // seconds until dusk is gone
const GOAL = 10; // crows to feed
const MAX_PLATES = 3;
const LIGHT_TIME = 0.85; // seconds beside a plate to light it
const EAT_TIME = 2.4;
const SPEED = 340;
const WALK = { top: 515, bottom: 692 };
// ---------------------------------------------------------------------------

const lerp = Phaser.Math.Linear;
const depthT = (y) => Phaser.Math.Clamp((y - WALK.top) / (WALK.bottom - WALK.top), 0, 1);
const walkLeft = (y) => lerp(150, 262, depthT(y));
const walkRight = (y) => lerp(1090, 1010, depthT(y));


export default class Night1 extends Phaser.Scene {
  constructor() {
    super('Night1');
  }

  init() {
    this._leaving = false;
    this.fed = 0;
    this.t = 0;
    this.over = false;
    this.won = false;
    this.winAmbient = 0;
    this.plates = [];
    this.crows = [];
    this.lastFlap = 0;
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
    coverBg(this, 'bg_n1', 0);

    this.light = new Lighting(this, { depth: 800, ambient: 0.04 });
    paperGrain(this, 0.12);

    // ---- the Keeper (carries one wick tonight)
    this.k = new Keeper(this, this.light, {
      x: 640, y: 620, top: WALK.top, bottom: WALK.bottom, left: walkLeft, right: walkRight, scale: [0.26, 0.36], speed: SPEED, wicks: 1,
    });
    this.k.onFirstMove = () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800, delay: 2500 });

    this.ringGfx = this.add.graphics().setDepth(820);

    this.buildHud();
    banner(this, { kicker: 'DAY 1  ·  NIGHT 1', title: NIGHTS[1].name, sub: NIGHTS[1].goal }, { hold: 2600 });
    this.hint = hintPill(this, 'Drag, arrow keys or WASD to move  ·  stand beside a plate to light it', H - 44);
    this.time.delayedCall(11000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));

    this.time.delayedCall(1800, () => this.spawnPlate());
    this.time.delayedCall(3600, () => this.spawnPlate());
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const g = this.add.graphics().setDepth(900);
    const pw = GOAL * 36 + 34;
    tornPaper(g, 18, 16, pw, 58, { seed: 3, amp: 2 });
    this.hudCrows = [];
    for (let i = 0; i < GOAL; i++) {
      const c = this.add.image(18 + 30 + i * 36, 46, 'crow_perched').setDepth(905).setAlpha(0.2);
      c.setScale(36 / c.height);
      this.hudCrows.push(c);
    }
    // dusk bar
    const bw = 300;
    const bx = W - 18 - bw;
    tornPaper(g, bx, 16, bw, 58, { seed: 9, amp: 2 });
    this.barX = bx + 28;
    this.barW = bw - 56;
    const c1 = Phaser.Display.Color.ValueToColor(COLORS.marigold);
    const c2 = Phaser.Display.Color.ValueToColor(COLORS.vermilion);
    const c3 = Phaser.Display.Color.ValueToColor(COLORS.indigo);
    const segs = 30;
    for (let i = 0; i < segs; i++) {
      const f = i / (segs - 1);
      const a = f < 0.5 ? c1 : c2;
      const b = f < 0.5 ? c2 : c3;
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 1, f < 0.5 ? f * 2 : (f - 0.5) * 2);
      g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      g.fillRect(this.barX + (i * this.barW) / segs, 38, this.barW / segs + 1, 16);
    }
    this.sun = this.add.graphics().setDepth(906);
    this.sun.fillStyle(COLORS.soot, 1).fillCircle(0, 0, 13);
    this.sun.fillStyle(COLORS.turmeric, 1).fillCircle(0, 0, 10);
    this.sun.fillStyle(0xfff3cf, 1).fillCircle(0, 0, 5);
    this.sun.setPosition(this.barX, 46);
    text(this, bx + bw / 2, 26, 'dusk', { size: 15, color: CSS.indigo, shadow: false, depth: 906 });
  }

  // ---------------------------------------------------------------- plates
  spawnPlate() {
    if (this.over || this.plates.length >= MAX_PLATES) return;
    let x;
    let y;
    for (let tries = 0; tries < 40; tries++) {
      y = Phaser.Math.Between(WALK.top + 15, WALK.bottom - 25);
      x = Phaser.Math.Between(walkLeft(y) + 30, walkRight(y) - 30);
      const far = this.plates.every((p) => Phaser.Math.Distance.Between(p.x, p.y * 1.7, x, y * 1.7) > 200);
      if (far && Phaser.Math.Distance.Between(this.k.x, this.k.y * 1.7, x, y * 1.7) > 230) break;
    }
    const tp = depthT(y);
    const w = lerp(120, 175, tp);
    const spr = this.add.image(x, y, 'thali_grain').setOrigin(0.5, 0.75).setDepth(y);
    spr.setScale(w / spr.width);
    const dh = spr.displayHeight;
    const spark = this.add.image(x, y - dh * 0.35, 'star').setDepth(812).setAlpha(0.6);
    const glow = this.add.image(x, y - dh * 0.3, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(730).setAlpha(0).setScale(w / 90);
    const p = {
      x, y, spr, spark, glow, w, dh, prog: 0, state: 'idle', light: null, seed: Math.random() * 10,
      perch: { x: x - w * 0.06, y: y - dh * 0.2 },
    };
    spr.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: spr, scale: w / spr.texture.getSourceImage().width, alpha: 1, duration: 450, ease: 'Back.easeOut' });
    this.plates.push(p);
  }

  updatePlates(dt, time) {
    const g = this.ringGfx;
    g.clear();
    for (const p of this.plates) {
      if (p.state === 'idle') {
        const dx = this.k.x - p.x;
        const dy = (this.k.y - p.y) * 1.7;
        const near = !this.over && dx * dx + dy * dy < 175 * 175;
        p.prog = near ? Math.min(1, p.prog + dt / LIGHT_TIME) : Math.max(0, p.prog - dt * 1.2);
        p.spark.setAlpha(0.45 + 0.35 * Math.sin(time * 0.006 + p.seed)).setScale(0.45 + 0.12 * Math.sin(time * 0.008 + p.seed));
        if (p.prog > 0.02) {
          g.lineStyle(7, COLORS.soot, 0.45);
          g.beginPath();
          g.arc(p.x, p.y - p.dh * 0.3, 58, 0, Math.PI * 2);
          g.strokePath();
          g.lineStyle(7, COLORS.turmeric, 1);
          g.beginPath();
          g.arc(p.x, p.y - p.dh * 0.3, 58, -Math.PI / 2, -Math.PI / 2 + p.prog * Math.PI * 2, false);
          g.strokePath();
        }
        if (p.prog >= 1) this.lightPlate(p);
      }
    }
  }

  lightPlate(p) {
    p.state = 'lit';
    p.spark.destroy();
    Sfx.light();
    p.light = this.light.add({ x: p.x, y: p.y - p.dh * 0.3, radius: 0, flicker: 0.05 });
    this.tweens.add({
      targets: p.light, radius: 200, duration: 500, ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: p.glow, alpha: 0.55, duration: 400 });
    this.time.delayedCall(Phaser.Math.Between(700, 1300), () => this.sendCrow(p));
  }

  // ---------------------------------------------------------------- crows
  sendCrow(p) {
    if (this.over || p.state !== 'lit') return;
    const fromLeft = Math.random() < 0.5;
    const p0 = { x: fromLeft ? -150 : W + 150, y: Phaser.Math.Between(60, 230) };
    const p2 = { x: p.perch.x, y: p.perch.y - 20 };
    const p1 = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - Phaser.Math.Between(120, 200) };
    const spr = this.add.image(p0.x, p0.y, 'crow_fly').setDepth(840);
    const base = lerp(150, 200, depthT(p.y)) / spr.width;
    spr.setScale(base);
    const c = { spr, base, mode: 'fly', seed: Math.random() * 6, p };
    this.crows.push(c);
    Sfx.flap();
    this.tweens.addCounter({
      from: 0, to: 1, duration: Phaser.Math.Between(1500, 1900), ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const u = 1 - t;
        spr.x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
        spr.y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
        const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
        const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
        const left = dx < 0;
        spr.setFlipX(left);
        const tilt = Math.atan2(dy, Math.abs(dx)) * 0.4;
        spr.setRotation(left ? -tilt : tilt);
      },
      onComplete: () => this.crowLands(c),
    });
  }

  crowLands(c) {
    const { spr, p, base } = c;
    c.mode = 'perch';
    spr.setTexture('crow_perched').setOrigin(0.5, 1).setRotation(0).setDepth(p.y + 1);
    const pw = lerp(125, 175, depthT(p.y));
    c.pBase = pw / spr.width;
    spr.setScale(c.pBase * 1.15, c.pBase * 0.85).setPosition(p.perch.x, p.perch.y).setFlipX(spr.flipX);
    this.tweens.add({ targets: spr, scaleX: c.pBase, scaleY: c.pBase, duration: 260, ease: 'Back.easeOut' });
    Sfx.caw();
    p.state = 'eating';
    this.fed++;
    const icon = this.hudCrows[this.fed - 1];
    if (icon) {
      icon.setAlpha(1);
      this.tweens.add({ targets: icon, scale: icon.scale * 1.5, yoyo: true, duration: 200 });
    }
    this.tweens.add({ targets: spr, angle: { from: -2, to: 7 }, yoyo: true, repeat: 4, duration: 240, delay: 380 });
    if (this.fed >= GOAL) this.time.delayedCall(1200, () => this.win());
    this.time.delayedCall(EAT_TIME * 1000, () => this.crowLeaves(c));
  }

  crowLeaves(c) {
    const { spr, p } = c;
    c.mode = 'leave';
    spr.setTexture('crow_fly').setOrigin(0.5, 0.5).setAngle(0);
    spr.setScale(c.base).setY(spr.y - spr.displayHeight * 0.4);
    const goLeft = spr.x < W / 2;
    spr.setFlipX(goLeft);
    Sfx.flap();
    this.tweens.add({
      targets: spr, x: goLeft ? -220 : W + 220, y: Phaser.Math.Between(20, 140), duration: 1700, ease: 'Quad.easeIn',
      onUpdate: () => spr.setRotation(goLeft ? 0.25 : -0.25),
      onComplete: () => {
        spr.destroy();
        this.crows.splice(this.crows.indexOf(c), 1);
      },
    });
    // the plate is empty now
    p.state = 'done';
    this.tweens.add({ targets: [p.spr, p.glow], alpha: 0, duration: 500 });
    if (p.light) this.tweens.add({ targets: p.light, radius: 0, duration: 600, onComplete: () => this.light.remove(p.light) });
    this.time.delayedCall(650, () => {
      p.spr.destroy();
      p.glow.destroy();
      this.plates.splice(this.plates.indexOf(p), 1);
    });
    this.time.delayedCall(1100, () => this.spawnPlate());
    this.time.delayedCall(2400, () => this.spawnPlate());
  }

  updateCrows(time) {
    for (const c of this.crows) {
      if (c.mode === 'fly' || c.mode === 'leave') {
        const f = 0.78 + 0.22 * Math.sin(time * 0.03 + c.seed);
        c.spr.setScale(c.base * (1 + (1 - f) * 0.25), c.base * f);
        if (time - this.lastFlap > 430) {
          this.lastFlap = time;
          Sfx.flap();
        }
      }
    }
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (!this.over) this.t += dt;
    this.k.update(time, dt);
    this.updatePlates(dt, time);
    this.updateCrows(time);

    const k = Math.min(1, this.t / DURATION);
    this.light.ambient = this.won ? this.winAmbient : 0.04 + 0.8 * Math.pow(k, 1.25);
    this.light.update(time);
    this.sun.x = this.barX + this.barW * k;

    if (!this.over && this.t >= DURATION && this.fed < GOAL) this.lose();
  }

  // ---------------------------------------------------------------- end states
  win() {
    if (this.over) return;
    this.over = true;
    this.won = true;
    this.k.enabled = false;
    Sfx.fanfare();
    const from = 0.04 + 0.8 * Math.pow(Math.min(1, this.t / DURATION), 1.25);
    this.winAmbient = from;
    this.tweens.addCounter({ from, to: 0.3, duration: 1800, onUpdate: (tw) => (this.winAmbient = tw.getValue()) });
    const t = titleText(this, W / 2, 250, 'The crows are fed.', { size: 64, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 236, duration: 900 });
    const left = Math.max(0, Math.round(DURATION - this.t));
    this.time.delayedCall(3600, () => {
      completeNight(1, { crows: this.fed });
      go(this, 'StoryCard', {
        night: 1,
        card: { ...NIGHTS[1].card, bg: NIGHTS[1].bg },
        stats: [
          { label: 'Crows fed', value: `${this.fed}/${GOAL}` },
          { label: 'Dusk to spare', value: `${left}s` },
        ],
        next: NIGHTS[1].next,
        wicksBefore: 1,
      });
    });
  }

  lose() {
    this.over = true;
    this.k.enabled = false;
    Sfx.fail();
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.45).setOrigin(0).setDepth(940);
    titleText(this, W / 2, 250, 'The light faded…', { size: 64, color: CSS.cream, depth: 950 });
    text(this, W / 2, 316, `${this.fed} of ${GOAL} crows were fed. The rest will wait for tomorrow.`, { size: 26, color: CSS.turmeric, depth: 950 });
    button(this, W / 2, 410, 'Try again', () => this.scene.restart(), { w: 300, h: 64, size: 30 });
    button(this, W / 2, 490, 'Back to the start', () => go(this, 'Title'), { w: 300, h: 56, size: 24 });
  }
}
