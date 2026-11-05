import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { FlameCluster } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, banner, hintPill, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys } from '../ui/ui.js';

// ---- the mandala, as five lines drawn one after another --------------------
const CX = 640; // centre of the disc on screen
const CY = 388;
const R = 262; // disc radius
const SPACING = 11; // distance between guide dots
const HIT = 30; // how close the light must pass to light a dot
const NEED = 0.93; // share of dots needed to finish a line
const FLAME_DROP = 22; // the flame's base sits this far below the pointer, so its body is centred on the pointer

const LINE_COLORS = [COLORS.marigold, COLORS.vermilion, COLORS.turmeric, COLORS.magenta, 0xfff3cf];
const LINE_NAMES = ['The outer ring', 'The eight-pointed star', 'The lotus', 'The inner ring', 'The bindu'];

function resample(poly, closed, corners = false) {
  const pts = closed ? [...poly, poly[0]] : poly;
  if (corners) {
    // straight-edged shapes: split every edge into equal steps so each corner is exactly a dot
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SPACING));
      for (let s = 0; s < n; s++) out.push({ x: a.x + ((b.x - a.x) * s) / n, y: a.y + ((b.y - a.y) * s) / n });
    }
    return out;
  }
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = SPACING - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += SPACING;
    }
    carry = seg - (d - SPACING);
  }
  return out;
}

function circle(r, from = -Math.PI / 2) {
  const n = 240;
  return resample(Array.from({ length: n }, (_, i) => ({ x: Math.cos(from + (i / n) * Math.PI * 2) * r, y: Math.sin(from + (i / n) * Math.PI * 2) * r })), true);
}

function star(r) {
  const v = Array.from({ length: 8 }, (_, k) => ({ x: Math.cos(-Math.PI / 2 + (k * Math.PI) / 4) * r, y: Math.sin(-Math.PI / 2 + (k * Math.PI) / 4) * r }));
  const order = [0, 3, 6, 1, 4, 7, 2, 5];
  return resample(order.map((i) => v[i]), true, true);
}

function lotus(a) {
  // rose curve r = a*cos(4t): eight petals in one unbroken line, rotated so the tips meet the star
  const n = 900;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = a * Math.cos(4 * t);
    const ang = t - Math.PI / 2;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  });
  return resample(pts, true);
}

const LINES = [circle(R - 38), star(190), lotus(138), circle(62), circle(18)];

export default class Night4 extends Phaser.Scene {
  constructor() {
    super('Night4');
  }

  init() {
    this._leaving = false;
    this.phase = 'intro'; // intro -> trace -> done
    this.line = 0;
    this.lit = LINES.map((l) => new Array(l.length).fill(false));
    this.done = LINES.map(() => false);
    this.last = null;
    this.t = 0;
    this.pointer = { x: CX, y: CY - 120, down: false };
    this.ambient = 0.3;
    this.lines = LINES; // exposed for tests
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
    coverBg(this, 'bg_n4', 0);

    this.shade = this.add.rectangle(0, 0, W, H, COLORS.soot, 0).setOrigin(0).setDepth(50);
    this.light = new Lighting(this, { depth: 800, ambient: this.ambient });
    this.discLight = this.light.add({ x: CX, y: CY, radius: 0, flicker: 0.02 });
    this.penLight = this.light.add({ x: CX, y: CY - 120, radius: 150, flicker: 0.05 });
    paperGrain(this, 0.12);

    // the paper disc, drawn once, looked down on from above (it starts as the squashed oval on the ground)
    this.disc = this.add.container(CX, CY).setDepth(100);
    const dg = this.add.graphics();
    dg.fillStyle(COLORS.soot, 0.35).fillCircle(6, 9, R + 6);
    dg.fillStyle(COLORS.cream, 1).fillCircle(0, 0, R);
    dg.lineStyle(5, COLORS.indigo, 0.55).strokeCircle(0, 0, R - 12);
    dg.lineStyle(3, COLORS.turmeric, 0.9).strokeCircle(0, 0, R - 22);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      dg.fillStyle(COLORS.marigold, 0.9).fillCircle(Math.cos(a) * (R - 5), Math.sin(a) * (R - 5), 4);
    }
    this.disc.add(dg);
    this.disc.setScale(1, 0.34).setAlpha(0.0);

    this.guide = this.add.graphics().setDepth(110); // dots + lit line
    this.glow = this.add.graphics().setDepth(111).setBlendMode(Phaser.BlendModes.ADD);
    this.marker = this.add.graphics().setDepth(112);

    // the light is a single flame, and that flame IS the cursor (the system arrow is hidden)
    this.input.setDefaultCursor('none');
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
    this.pen = new FlameCluster(this, 1, { size: 56, depth: 760 });
    this.pen.setPosition(this.pointer.x, this.pointer.y + FLAME_DROP);
    this.add.particles(0, 0, 'ember', {
      lifespan: { min: 700, max: 1300 }, speedY: { min: -40, max: -90 }, speedX: { min: -20, max: 20 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 120,
    }).setDepth(770).startFollow(this.pen, 0, -30);

    this.petals = this.add
      .particles(0, 0, 'petal', {
        lifespan: 2400, speedX: { min: -220, max: 220 }, speedY: { min: -360, max: -120 }, gravityY: 380,
        rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
      })
      .setDepth(830);

    this.input.on('pointerdown', (p) => {
      this.pointer.down = true;
      this.pointer.x = p.worldX;
      this.pointer.y = p.worldY;
      this.last = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointermove', (p) => {
      this.pointer.x = p.worldX;
      this.pointer.y = p.worldY;
      if (p.isDown) this.trace(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.pointer.down = false;
      this.last = null;
    });
    // keyboard fallback: hold Space and use arrow keys / WASD to draw
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.space = this.input.keyboard.addKey('SPACE');

    this.say = text(this, W / 2, 96, '', { size: 28, color: CSS.cream, depth: 906 });
    this.buildHud();

    banner(this, { kicker: 'DAY 4  ·  NIGHT 4', title: NIGHTS[4].name, sub: NIGHTS[4].goal }, { hold: 2800 });
    // zoom in on the ground: the oval opens into a full circle
    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: this.shade, fillAlpha: 0.55, duration: 1200 });
      this.tweens.add({ targets: this.disc, scaleY: 1, alpha: 1, duration: 1500, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: this.discLight, radius: 380, duration: 1500 });
      this.tweens.add({ targets: this, ambient: 0.62, duration: 1500 });
      this.time.delayedCall(1500, () => this.beginLine(0));
    });
    this.hint = hintPill(this, 'Press and drag to trace the dotted line with your light', H - 44);
    this.time.delayedCall(14000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
  }

  buildHud() {
    const g = this.add.graphics().setDepth(900);
    tornPaper(g, 18, 16, 5 * 40 + 40, 58, { seed: 21, amp: 2 });
    this.dots = [];
    for (let i = 0; i < 5; i++) {
      const c = this.add.circle(18 + 38 + i * 40, 46, 11, LINE_COLORS[i], 1).setDepth(905).setAlpha(0.25).setStrokeStyle(2, COLORS.soot, 0.7);
      this.dots.push(c);
    }
  }

  beginLine(i) {
    this.line = i;
    this.phase = 'trace';
    this.say.setText(LINE_NAMES[i]).setAlpha(0);
    this.tweens.add({ targets: this.say, alpha: 1, duration: 500 });
    Sfx.note(i);
  }

  // light every dot of the current line that the pen passes near
  trace(x, y) {
    if (this.phase !== 'trace') return;
    const from = this.last || { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const steps = Math.max(1, Math.ceil(dist / 8));
    const pts = LINES[this.line];
    const lit = this.lit[this.line];
    let gained = 0;
    for (let s = 1; s <= steps; s++) {
      const px = from.x + ((x - from.x) * s) / steps - CX;
      const py = from.y + ((y - from.y) * s) / steps - CY;
      for (let i = 0; i < pts.length; i++) {
        if (!lit[i] && Math.hypot(pts[i].x - px, pts[i].y - py) < HIT) {
          lit[i] = true;
          gained++;
        }
      }
    }
    this.last = { x, y };
    if (gained && !this._tick) {
      this._tick = true;
      this.time.delayedCall(90, () => (this._tick = false));
    }
    const count = lit.filter(Boolean).length;
    if (count / pts.length >= NEED) this.finishLine();
  }

  finishLine() {
    const i = this.line;
    this.lit[i].fill(true);
    this.done[i] = true;
    this.phase = 'between';
    this.dots[i].setAlpha(1);
    this.tweens.add({ targets: this.dots[i], scale: 1.5, yoyo: true, duration: 220 });
    Sfx.chime();
    this.petals.explode(12, CX, CY - 40);
    if (i === LINES.length - 1) this.time.delayedCall(700, () => this.win());
    else this.time.delayedCall(900, () => this.beginLine(i + 1));
  }

  // ---------------------------------------------------------------- drawing
  draw(time) {
    const g = this.guide;
    const gl = this.glow;
    const m = this.marker;
    g.clear();
    gl.clear();
    m.clear();
    if (this.disc.alpha < 0.9) return;
    LINES.forEach((pts, li) => {
      const col = LINE_COLORS[li];
      const lit = this.lit[li];
      const showGuide = li === this.line && this.phase === 'trace';
      if (!this.done[li] && !showGuide && !lit.some(Boolean)) return;
      // dots of the guide
      if (showGuide) {
        for (let i = 0; i < pts.length; i++) {
          if (lit[i]) continue;
          g.fillStyle(0x8f7443, 1).fillCircle(CX + pts[i].x, CY + pts[i].y, 3.6);
        }
      }
      // the lit line: segments between neighbouring lit dots
      const w = this.done[li] ? 8 : 6;
      g.lineStyle(w, col, 1);
      gl.lineStyle(w + 14, col, this.done[li] ? 0.28 + 0.1 * Math.sin(time * 0.004 + li) : 0.22);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        if (lit[i] && lit[j] && (j !== 0 || this.done[li])) {
          g.lineBetween(CX + pts[i].x, CY + pts[i].y, CX + pts[j].x, CY + pts[j].y);
          gl.lineBetween(CX + pts[i].x, CY + pts[i].y, CX + pts[j].x, CY + pts[j].y);
        }
        // round join at every lit dot, so corners and crossings have no gaps or notches
        if (lit[i]) {
          g.fillStyle(col, 1).fillCircle(CX + pts[i].x, CY + pts[i].y, w / 2);
        }
      }
    });
    // where to start
    if (this.phase === 'trace') {
      const p = LINES[this.line][0];
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
      m.lineStyle(4, COLORS.turmeric, 0.9).strokeCircle(CX + p.x, CY + p.y, 12 + pulse * 7);
      m.fillStyle(COLORS.turmeric, 1).fillCircle(CX + p.x, CY + p.y, 6);
    }
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;

    // keyboard pen: Space down + arrows move the light
    if (this.phase === 'trace' || this.phase === 'intro') {
      let vx = 0;
      let vy = 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
      if (vx || vy) {
        const l = Math.hypot(vx, vy);
        this.pointer.x = Phaser.Math.Clamp(this.pointer.x + (vx / l) * 300 * dt, 40, W - 40);
        this.pointer.y = Phaser.Math.Clamp(this.pointer.y + (vy / l) * 300 * dt, 120, H - 40);
        if (this.space.isDown && this.phase === 'trace') this.trace(this.pointer.x, this.pointer.y);
        else this.last = null;
      }
    }

    // the flame sits exactly on the pointer
    const px = this.pointer.x;
    const py = this.pointer.y;
    this.pen.setPosition(px, py + FLAME_DROP);
    this.pen.update(time);
    this.penLight.x = px;
    this.penLight.y = py;
    this.penLight.radius = this.pointer.down ? 190 : 130;

    this.draw(time);
    this.light.ambient = this.ambient;
    this.light.update(time);
  }

  // ---------------------------------------------------------------- done
  win() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    Sfx.fanfare();
    this.say.setText('');
    this.tweens.add({ targets: this, ambient: 0.35, duration: 1800 });
    this.tweens.add({ targets: this.penLight, radius: 520, duration: 1600 });
    this.petals.explode(50, CX, CY - 80);
    const t = titleText(this, W / 2, 92, 'The mandala is lit.', { size: 58, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 900 });
    this.time.delayedCall(4200, () => {
      completeNight(4, {});
      go(this, 'StoryCard', {
        night: 4,
        card: { ...NIGHTS[4].card, bg: NIGHTS[4].bg },
        stats: [
          { label: 'Lines drawn', value: '5/5' },
          { label: 'Time', value: `${Math.round(this.t)}s` },
        ],
        next: NIGHTS[4].next,
        wicksBefore: 4,
      });
    });
  }
}
