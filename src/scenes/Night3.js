import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS, NIGHT_LEVEL } from '../data/nights.js';
import { Album } from '../systems/album.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { Keeper } from '../systems/Keeper.js';
import { Flame } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { finish, snap, stepNoise } from '../systems/Motion.js';
import { text, titleText, hintPill, instructions, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys, hudButtons, loseScreen, outlined, reviewerControls } from '../ui/ui.js';

const lerp = Phaser.Math.Linear;

// ---- tuning -------------------------------------------------------------
const DURATION = 36; // seconds until midnight
const MAX_SPARKS = 5;
const FLOOR = { top: 420, bottom: 700 };
// the courtyard floor in bg_n3: [y, left edge, right edge] - keeps everyone off the side benches and walls
const EDGES = [[420, 240, 1040], [500, 225, 1065], [600, 135, 1155], [700, 40, 1245]];
function edgeAt(y, i) {
  if (y <= EDGES[0][0]) return EDGES[0][i];
  for (let k = 1; k < EDGES.length; k++) {
    if (y <= EDGES[k][0]) return lerp(EDGES[k - 1][i], EDGES[k][i], (y - EDGES[k - 1][0]) / (EDGES[k][0] - EDGES[k - 1][0]));
  }
  return EDGES[EDGES.length - 1][i];
}
const leftAt = (y) => edgeAt(y, 1);
const rightAt = (y) => edgeAt(y, 2);
const GUST_WARNING = 0.7; // seconds between the whoosh and the lamps dimming
const REFILL = 1.0; // oil per second while the Keeper stands beside a lamp
// the four lamps stand on the courtyard floor in a shallow arc, framing the middle archway
const LAMPS = [
  { x: 270, y: 478 },
  { x: 500, y: 436 },
  { x: 790, y: 436 },
  { x: 1020, y: 478 },
];
// ---------------------------------------------------------------------------

export default class Night3 extends Phaser.Scene {
  constructor() {
    super('Night3');
  }

  init() {
    this._leaving = false;
    this.t = 0;
    this.over = false;
    this.sparks = MAX_SPARKS;
    this.lamps = [];
    this.items = [];
    this.carry = false;
    this.garlandsGiven = 0;
    this.blessing = 0;
    this.started = false;
    this.nextGust = 8;
    this.nextGarland = 3; // the first garland; each next one comes 5 s after the last is given (even a slow player gets three)
    this.winAmbient = 0;
    this.won = false;
    this.lastBell = 0;
    this.flareMul = 1;
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
    Sfx.setLevel(NIGHT_LEVEL[3]);
    coverBg(this, 'bg_n3', 0);

    this.light = new Lighting(this, { depth: 800, ambient: 0.4 });
    finish(this);
    paperGrain(this, 0.12);

    // lamps on the courtyard floor, each slowly burning down
    LAMPS.forEach((h) => {
      const { x, y } = h;
      const spr = this.add.image(x, y, 'diya').setOrigin(0.5, 0.6).setDepth(y);
      spr.setScale(64 / spr.width);
      const flame = new Flame(this, x + spr.displayWidth * 0.46, y - spr.displayHeight * 0.45, { size: 42, depth: y + 2 });
      const light = this.light.add({ x, y: y - 40, radius: 210, flicker: 0.06 });
      this.lamps.push({ x, y, spr, flame, light, oil: Phaser.Math.FloatBetween(0.75, 1), lit: true, outT: 0, penalised: false, near: false });
    });
    this.bars = this.add.graphics().setDepth(815);

    // the cow, who wanders the courtyard
    this.cow = { x: 640, y: 600, dir: 1, tx: 640, ty: 600, pause: 2, eat: 0, wear: false };
    this.cowSpr = this.add.image(this.cow.x, this.cow.y, 'cow').setOrigin(0.5, 1);
    this.cowSpr.setScale(270 / this.cowSpr.width);

    // the Keeper, three wicks tonight
    this.k = new Keeper(this, this.light, {
      x: 430, y: 630, top: FLOOR.top, bottom: FLOOR.bottom, left: leftAt, right: rightAt,
      scale: [0.2, 0.3], speed: 360, wicks: 3, flameSize: 46, lightRadius: 300,
    });
    this.k.onFirstMove = () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800, delay: 3000 });
    this.carrySpr = this.add.image(0, 0, 'marigold_mala').setVisible(false);
    this.carrySpr.setScale(92 / this.carrySpr.width);

    this.petals = this.add
      .particles(0, 0, 'petal', {
        lifespan: 2000, speedX: { min: -140, max: 140 }, speedY: { min: -280, max: -90 }, gravityY: 340,
        rotate: { min: 0, max: 360 }, scale: { start: 0.9, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
      })
      .setDepth(830);
    this.wind = this.add
      .particles(0, 0, 'petal', {
        lifespan: 1100, speedX: { min: 700, max: 1000 }, speedY: { min: -40, max: 40 }, rotate: { min: 0, max: 360 },
        scale: { start: 0.7, end: 0.3 }, alpha: { start: 0.9, end: 0 }, emitting: false,
      })
      .setDepth(830);

    this.spark = this.add
      .particles(0, 0, 'ember', { speed: { min: 30, max: 110 }, lifespan: 700, scale: { start: 1, end: 0 }, blendMode: 'ADD', tint: 0xffd36e, emitting: false })
      .setDepth(8);
    this.cowMark = this.add.image(0, 0, 'star').setDepth(900).setVisible(false).setScale(0.6); // points at the cow while you carry a garland
    this.buildHud();
    hudButtons(this, { pause: true });
    reviewerControls(this);
    this.k.enabled = false;
    this.startLevel();
  }

  startLevel() {
    this.started = true;
    this.k.enabled = true;
    this.hint = hintPill(this, 'Stand beside a lamp to refill it, and to shield it from the wind', H - 44);
    this.time.delayedCall(10000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const g = this.add.graphics().setDepth(900);
    const pw = MAX_SPARKS * 44 + 30;
    tornPaper(g, 18, 16, pw, 58, { seed: 13, amp: 2 });
    this.sparkIcons = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      const d = this.add.image(18 + 38 + i * 44, 47, 'diya').setDepth(905);
      d.setScale(38 / d.width);
      this.sparkIcons.push(d);
    }
    const bw = 300;
    const bx = W - 18 - bw;
    tornPaper(g, bx, 16, bw, 58, { seed: 17, amp: 2 });
    this.barX = bx + 28;
    this.barW = bw - 56;
    const c1 = Phaser.Display.Color.ValueToColor(COLORS.marigold);
    const c2 = Phaser.Display.Color.ValueToColor(COLORS.indigo);
    const segs = 30;
    for (let i = 0; i < segs; i++) {
      const f = i / (segs - 1);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 1, Math.min(1, f * 1.3));
      g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      g.fillRect(this.barX + (i * this.barW) / segs, 38, this.barW / segs + 1, 16);
    }
    this.moon = this.add.graphics().setDepth(906);
    this.moon.fillStyle(COLORS.soot, 1).fillCircle(0, 0, 13);
    this.moon.fillStyle(COLORS.turmeric, 1).fillCircle(0, 0, 10);
    this.moon.fillStyle(COLORS.indigo, 1).fillCircle(4, -3, 8);
    this.moon.setPosition(this.barX, 46);
    text(this, bx + bw / 2, 26, 'midnight', { size: 15, color: CSS.indigo, shadow: false, depth: 906 });
    this.carryText = text(this, W / 2, 112, '', { size: 24, color: CSS.cream, depth: 906 }).setAlpha(0);
  }

  // ---------------------------------------------------------------- lamps
  updateLamps(dt, time) {
    const k = this.k;
    // oil only burns down once the night has started
    const rate = !this.started || this.over ? 0 : lerp(1 / 16, 1 / 9, Math.min(1, this.t / DURATION)) * (this.blessing > 0 ? 0.35 : 1);
    this.bars.clear();
    for (const l of this.lamps) {
      const dx = k.x - l.x;
      const dy = (k.y - (l.y + 18)) * 1.5;
      l.near = !this.over && dx * dx + dy * dy < 150 * 150;
      if (l.near) l.oil = Math.min(1, l.oil + REFILL * dt);
      else l.oil = Math.max(0, l.oil - rate * dt);

      // relight / go out (with a little hysteresis)
      if (l.lit && l.oil <= 0) {
        l.lit = false;
        if (!this.over) Sfx.fail();
      } else if (!l.lit && l.oil > 0.2) {
        l.lit = true;
        Sfx.light();
      }
      // a lamp that stays dark for a while costs a spark; relight it in time and nothing is lost
      if (!l.lit && !this.over) {
        l.outT += dt;
        if (l.outT > 2.5 && !l.penalised) {
          l.penalised = true;
          this.loseSpark(l);
        }
      } else {
        l.outT = 0;
        l.penalised = false;
      }
      const fl = l.lit ? Phaser.Math.Clamp(l.oil * 3.2, 0.35, 1) : 0;
      l.flame.setSize(40 * fl);
      l.flame.setVisible(l.lit);
      l.flame.update(time);
      l.light.radius = (l.lit ? 210 * (0.6 + 0.4 * Math.min(1, l.oil * 2)) : 0) * this.flareMul;
      // oil gauge
      this.bars.fillStyle(COLORS.soot, 0.55).fillRoundedRect(l.x - 33, l.y + 26, 66, 11, 4);
      if (l.oil > 0.01) this.bars.fillStyle(l.oil < 0.28 ? COLORS.vermilion : COLORS.marigold, 1).fillRoundedRect(l.x - 31, l.y + 28, 62 * l.oil, 7, 3);
    }
  }

  loseSpark(l) {
    this.sparks = Math.max(0, this.sparks - 1);
    const icon = this.sparkIcons[this.sparks];
    this.tweens.add({ targets: icon, alpha: 0.2, scale: icon.scale * 0.7, duration: 300 });
    Sfx.fail();
    this.cameras.main.shake(120, 0.003);
    if (this.sparks <= 0) this.lose();
  }

  // a gust announces itself first (whoosh + petals blow in), then dims the lamps a moment later
  warnGust() {
    Sfx.whoosh();
    this.wind.explode(26, -40, Phaser.Math.Between(420, 620));
    this.time.delayedCall(GUST_WARNING * 1000, () => this.gust());
  }

  gust() {
    if (this.over) return;
    const picks = Phaser.Utils.Array.Shuffle(this.lamps.filter((l) => l.lit && !l.near)).slice(0, 2);
    // a gust dims two unguarded lamps; late in the night it can blow a weak one right out
    picks.forEach((l, i) => {
      if (i === 0 && this.t > DURATION * 0.65 && l.oil < 0.55) l.oil = 0;
      else l.oil = Math.max(Math.min(l.oil, 0.15), l.oil - 0.45);
    });
    // the lamps you stand beside: cupped hands, the flame bends but holds
    this.lamps
      .filter((l) => l.lit && l.near)
      .forEach((l) => {
        const r = this.add.image(l.x, l.y - 40, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0.7).setDepth(835);
        this.tweens.add({ targets: r, scale: 2.2, alpha: 0, duration: 520, onComplete: () => r.destroy() });
        Sfx.perfect();
      });
  }

  // ---------------------------------------------------------------- cow & garlands
  updateCow(dt, time) {
    const c = this.cow;
    if (c.eat > 0) {
      c.eat -= dt;
    } else if (c.pause > 0) {
      c.pause -= dt;
      if (c.pause <= 0) {
        c.ty = Phaser.Math.Between(540, 665);
        c.tx = Phaser.Math.Between(leftAt(c.ty) + 140, rightAt(c.ty) - 140);
      }
    } else {
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) c.pause = Phaser.Math.FloatBetween(1, 2.5);
      else {
        const calm = this.blessing > 0 ? 0.55 : 1; // during the blessing she ambles
        c.x += (dx / d) * 55 * calm * dt;
        c.y += (dy / d) * 34 * calm * dt;
        if (Math.abs(dx) > 4) c.dir = dx > 0 ? 1 : -1;
      }
    }
    const walking = c.eat <= 0 && c.pause <= 0;
    const ts = snap(time, 8);
    const bob = walking ? Math.abs(Math.sin(ts * (this.blessing > 0 ? 0.004 : 0.006))) * (this.blessing > 0 ? 6 : 3) : Math.sin(time * 0.002) * 0.6;
    this.cowSpr.setPosition(c.x, c.y - bob).setFlipX(c.dir < 0).setDepth(c.y);
    const kk = this.k;
    const hidden = kk.y < c.y && Math.abs(kk.x - c.x) < 150 && c.y - kk.y < 170;
    this.cowSpr.setAlpha(Phaser.Math.Linear(this.cowSpr.alpha, hidden ? 0.42 : 1, 0.2));
    if (walking && time - this.lastBell > 2600) {
      this.lastBell = time;
      Sfx.cowbell();
    }
    if (c.eat > 0) this.cowSpr.setAngle(Math.sin(time * 0.012) * 1.8);
    else this.cowSpr.setAngle(walking ? stepNoise(time, 3, 8) * 1.1 : 0);
    // the cow is solid: nudge the Keeper around her
    const k = this.k;
    const ex = (k.x - c.x) / 115;
    const ey = (k.y - (c.y - 4)) / 30;
    const d = Math.hypot(ex, ey);
    if (d < 1 && d > 0.001) {
      k.x = c.x + (ex / d) * 115;
      k.y = c.y - 4 + (ey / d) * 30;
      // the nudge happens after the Keeper clamped himself: keep him (and his light) inside the courtyard
      k.y = Phaser.Math.Clamp(k.y, FLOOR.top, FLOOR.bottom);
      k.x = Phaser.Math.Clamp(k.x, leftAt(k.y), rightAt(k.y));
    }
  }

  spawnGarland() {
    if (this.over || this.items.length || this.carry) return;
    let x;
    let y;
    for (let i = 0; i < 30; i++) {
      y = Phaser.Math.Between(FLOOR.top + 30, FLOOR.bottom - 20);
      x = Phaser.Math.Between(leftAt(y) + 40, rightAt(y) - 40);
      if (Math.hypot(x - this.cow.x, (y - this.cow.y) * 2) > 260 && Math.hypot(x - this.k.x, y - this.k.y) > 200) break;
    }
    const pad = outlined(this, 'marigold_mala', 'mala_outlined');
    const spr = this.add.image(x, y, 'mala_outlined').setDepth(y);
    spr.setScale(104 / (spr.width - pad * 2)).setAlpha(0);
    this.tweens.add({ targets: spr, alpha: 1, duration: 500 });
    const glow = this.add.image(x, y - 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd98a).setDepth(y - 1).setScale(2.6).setAlpha(0.85);
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 2.2, yoyo: true, repeat: -1, duration: 600 });
    const mark = this.add.image(x, y - 78, 'star').setDepth(y + 1).setScale(0.85);
    this.tweens.add({ targets: mark, scale: 1.05, yoyo: true, repeat: -1, duration: 450 });
    this.items.push({ x, y, spr, glow, mark });
    this.say('A marigold garland! Carry it to the cow.');
  }

  say(str) {
    this.carryText.setText(str).setAlpha(1);
    this.tweens.killTweensOf(this.carryText);
    this.tweens.add({ targets: this.carryText, alpha: 0, delay: 3200, duration: 600 });
  }

  updateItems(time) {
    const k = this.k;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.spr.y = it.y + Math.sin(time * 0.004 + i) * 4;
      it.glow.setAlpha(0.6 + 0.3 * Math.sin(time * 0.006));
      it.mark.y = it.y - 78 + Math.sin(time * 0.006 + i) * 6;
      // a generous oval around his feet and body (it used to be a small circle at the feet only)
      const dxk = (k.x - it.x) / 150;
      const reach = Math.min(Math.hypot(dxk, (k.y - it.y) / 110), Math.hypot(dxk, (k.y - 70 - it.y) / 110));
      if (!this.over && !this.carry && reach < 1) {
        this.carry = true;
        Sfx.collect();
        it.spr.destroy();
        it.glow.destroy();
        it.mark.destroy();
        this.items.splice(i, 1);
        this.say('Now bring it to the cow.');
      }
    }
    if (this.carry) {
      const h = k.displayHeight;
      this.carrySpr.setVisible(true).setPosition(k.x, k.y - h * 0.5).setAngle(-6).setDepth(k.y + 2);
      const c = this.cow;
      if (!this.over && Math.hypot((k.x - c.x) / 190, (k.y - c.y) / 70) < 1) this.garlandCow();
    } else this.carrySpr.setVisible(false);
    this.cowMark.setVisible(this.carry && !this.over);
    if (this.carry) this.cowMark.setPosition(this.cow.x, this.cow.y - 262 + Math.sin(time * 0.006) * 7);
  }

  garlandCow() {
    this.carry = false;
    this.garlandsGiven++;
    this.cow.wear = true;
    // from now on she wears the garland: swap to the garlanded cow art (same size and pose)
    this.cowSpr.setTexture('cow_mala');
    this.cow.eat = 3.6;
    this.blessing = 9;
    this.sparks = Math.min(MAX_SPARKS, this.sparks + 1);
    this.sparkIcons.forEach((d, i) => {
      d.setAlpha(i < this.sparks ? 1 : 0.2).setScale(38 / d.width);
    });
    this.lamps.forEach((l) => (l.oil = 1));
    this.petals.explode(30, this.cow.x, this.cow.y - 120);
    Sfx.chime();
    Sfx.bell();
    this.say('Gai Puja done. The lamps are filled and burn slowly.');
    this.nextGarland = this.t + 5;
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    let dt = Math.min(delta / 1000, 0.05);
    if (this.fastPlay) dt *= 2;
    if (this.started && !this.over) this.t += dt;
    this.blessing = Math.max(0, this.blessing - dt);
    this.k.update(time, dt);
    this.updateCow(dt, time);
    this.updateLamps(dt, time);
    this.updateItems(time);
    if (this.autoPlay && this.started && !this.over && this.k?.enabled) {
      if (this.carry) {
        this.k.target = { x: this.cow.x, y: this.cow.y };
      } else if (this.items && this.items.length) {
        this.k.target = { x: this.items[0].x, y: this.items[0].y };
      } else {
        let lowest = null;
        for (const l of this.lamps) {
          if (!lowest || l.oil < lowest.oil) lowest = l;
        }
        if (lowest) this.k.target = { x: lowest.x, y: lowest.y + 18 };
      }
    }

    if (!this.over) {
      if (this.t >= this.nextGust) {
        this.warnGust();
        this.nextGust = this.t + Phaser.Math.FloatBetween(7, 9);
      }
      if (this.t >= this.nextGarland && !this.carry && !this.items.length) this.spawnGarland();
      if (this.t >= DURATION) this.win();
    }

    const k = Math.min(1, this.t / DURATION);
    this.light.ambient = this.won ? this.winAmbient : 0.4 + 0.36 * k;
    this.light.update(time);
    this.moon.x = this.barX + this.barW * k;
    this.sparkIcons.forEach((d, i) => d.setAlpha(i < this.sparks ? 1 : 0.2));
  }

  // ---------------------------------------------------------------- end states
  win() {
    if (this.over) return;
    this.over = true;
    this.won = true;
    this.k.enabled = false;
    Sfx.fanfare();
    this.winAmbient = 0.4 + 0.36;
    this.tweens.addCounter({ from: this.winAmbient, to: 0.44, duration: 1800, onUpdate: (tw) => (this.winAmbient = tw.getValue()) });
    this.lamps.forEach((l) => (l.oil = Math.max(l.oil, 0.6)));
    const t = titleText(this, W / 2, 230, 'Laxmi walks the lit lanes.', { size: 58, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 216, duration: 900 });
    const burning = this.lamps.filter((l) => l.lit).length;
    const walkEnd = this.laxmiWalks(burning);
    this.time.delayedCall(walkEnd + 1500, () => {
      completeNight(3, { sparks: this.sparks });
      go(this, 'StoryCard', {
        night: 3,
        card: { ...NIGHTS[3].card, bg: NIGHTS[3].bg },
        stats: [
          { label: 'Lamps burning at midnight', value: `${burning}/${this.lamps.length}` },
          { label: 'Garlands given to the cow', value: String(this.garlandsGiven) },
        ],
        next: NIGHTS[3].next,
        wicksBefore: 3,
      });
    });
  }

  /** Golden lotus footprints (a placeholder drawn in code) walk in from the gate toward the brightest door. Returns when she arrives (ms). */
  makeFootprint() {
    if (this.textures.exists('footprint')) return;
    const tex = this.textures.createCanvas('footprint', 72, 120);
    const x = tex.getContext();
    const shapes = (fill, stroke, lw) => {
      x.fillStyle = fill;
      x.strokeStyle = stroke;
      x.lineWidth = lw;
      const draw = () => {
        if (lw) x.stroke();
        x.fill();
      };
      x.beginPath(); x.ellipse(36, 98, 15, 17, 0, 0, Math.PI * 2); draw(); // heel
      x.beginPath(); x.moveTo(24, 86); x.quadraticCurveTo(19, 70, 21, 56); x.lineTo(52, 56); x.quadraticCurveTo(54, 72, 47, 88); x.closePath(); draw(); // arch
      x.beginPath(); x.ellipse(38, 50, 22, 28, -0.08, 0, Math.PI * 2); draw(); // ball of the foot
      [[56, 18, 8.5], [41, 11, 7.5], [27, 14, 6.5], [16, 22, 5.8], [9, 33, 5]].forEach(([tx, ty, r]) => { x.beginPath(); x.arc(tx, ty, r, 0, Math.PI * 2); draw(); }); // toes
    };
    shapes('#b07a1e', '#b07a1e', 6); // outline pass...
    shapes('#f2b84b', '#f2b84b', 0); // ...then the gold on top, so the outline is one clean edge
    x.fillStyle = '#fff3cf'; // a little lotus on the ball of the foot
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      x.beginPath();
      x.ellipse(38 + Math.cos(a) * 7, 49 + Math.sin(a) * 7, 3.2, 7, a + Math.PI / 2, 0, Math.PI * 2);
      x.fill();
    }
    tex.refresh();
  }

  laxmiWalks(burning) {
    this.makeFootprint();
    const TOTAL = 10;
    const steps = 6 + burning; // every lamp that is lit carries her one step further
    const START = 700;
    const GAP = 330;
    for (let i = 0; i < steps; i++) {
      const u = i / (TOTAL - 1);
      const y = lerp(690, 396, u);
      const x = 640 + (i % 2 ? 34 : -34) * lerp(1, 0.5, u);
      const sc = lerp(0.95, 0.4, u);
      this.time.delayedCall(START + i * GAP, () => {
        const glow = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc860).setDepth(5).setScale(sc * 0.95).setAlpha(0);
        const fp = this.add.image(x, y, 'footprint').setDepth(6).setScale(sc * 0.6).setFlipX(i % 2 === 1).setAngle(Phaser.Math.Between(-5, 5)).setAlpha(0);
        this.tweens.add({ targets: [fp, glow], alpha: 1, duration: 320 });
        this.tweens.add({ targets: glow, alpha: 0.45, delay: 320, duration: 900 });
        this.spark.explode(5, x, y);
        Sfx.footprint(i);
      });
    }
    const end = START + steps * GAP;
    this.time.delayedCall(end, () => {
      // she arrives: the doorway glows, petals fall, the lamps flare
      const strong = burning >= 4;
      const flare = this.add.image(640, 330, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd98a).setDepth(7).setScale(1).setAlpha(0);
      this.tweens.add({ targets: flare, scale: strong ? 9 : 5, alpha: strong ? 0.8 : 0.45, duration: 1100, ease: 'Sine.easeOut' });
      this.petals.explode(strong ? 70 : 30, 640, 300);
      this.tweens.addCounter({ from: 1, to: 1.4, duration: 700, yoyo: true, onUpdate: (tw) => (this.flareMul = tw.getValue()) });
      if (strong) Sfx.shimmer();
      else Sfx.chime();
      Sfx.bell();
      this.say(strong ? 'Every lamp burned: Laxmi reached the door.' : 'Laxmi walked as far as your lamps lit the way.');
      this.time.delayedCall(1300, () => Album.capture(this, 3));
    });
    return end;
  }

  lose() {
    if (this.over) return;
    this.over = true;
    this.k.enabled = false;
    loseScreen(this, 'The lanes went dark…', 'Laxmi visits only the homes that are lit. Try again?', { size: 60 });
  }
}
