import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { FlameCluster } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, button, hintPill, instructions, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys } from '../ui/ui.js';

// ---- the annakut, the hill of offerings ------------------------------------
const CX = 644; // the swept cream circle on the courtyard floor is the build spot
const BASE_Y = 652; // where the first dung pats sit
const SWING_CX = 644; // offerings drift above the spot, swinging left and right
const SWING_Y = 150;
const SWING_AMP = 300;
const SWING_W = 1.5; // radians per second
const GRAV = 2400;
const FALL_MAX = 1500; // falling speed cap
const V_MAX = 175; // horizontal carry at release, capped so aiming stays fair
const DROP = 26; // each placed layer rises this far above the one under it
const NEED = 14; // offerings to place; the 15th swing is the maha-deep
const LEAN_MAX = 21; // degrees; lean past this and the top layers slide off
const LEAN_PER_PX = 0.12; // how far off-centre a drop tilts the hill
const PERFECT = 14; // a drop this close steadies the hill
const DURATION = 95; // evening seconds

const OFFER_KEYS = ['thali_grain', 'bowl_rice', 'bowl_curd', 'dry_fruit_plate'];
// the art is painted as high three-quarter views; sq shrinks it so layers read flat and squat
const SQ = { dung_pat: 0.5, thali_grain: 0.85, bowl_rice: 0.82, bowl_curd: 0.82, dry_fruit_plate: 0.85, marigold_mala: 0.9, diya: 1 };
const NAMES = {
  dung_pat: 'The cow-dung base',
  thali_grain: 'A thali of grain',
  bowl_rice: 'A bowl of rice',
  bowl_curd: 'A bowl of curd',
  dry_fruit_plate: 'Dry fruits and sel roti',
  marigold_mala: 'Garlands of marigold',
  diya: 'The maha-deep',
};

// the hill's recipe: two dung pats, ten food layers, two garlands, then the lamp on top
function plan() {
  const p = [{ key: 'dung_pat', w: 430 }, { key: 'dung_pat', w: 400 }];
  for (let i = 2; i < 12; i++) p.push({ key: OFFER_KEYS[(Math.random() * OFFER_KEYS.length) | 0], w: 330 - (i - 2) * 8 });
  p.push({ key: 'marigold_mala', w: 340 });
  p.push({ key: 'marigold_mala', w: 300 });
  p.push({ key: 'diya', w: 175 });
  return p;
}

export default class Night4 extends Phaser.Scene {
  constructor() {
    super('Night4');
  }

  init() {
    this._leaving = false;
    this.phase = 'intro'; // intro -> swing -> fall -> settle / topple -> done
    this.started = false;
    this.over = false;
    this.t = 0;
    this.lean = 0; // degrees, target
    this.displayLean = 0;
    this.landed = []; // { spr, spec }
    this.miss = 0;
    this.item = null; // the swinging / falling sprite
    this.swap = null; // { key, w, h }
    this.ph = 0;
    this.ambient = 0.52;
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
    coverBg(this, 'bg_n4', 0);

    this.light = new Lighting(this, { depth: 800, ambient: this.ambient });
    this.hillLight = this.light.add({ x: CX, y: BASE_Y - 150, radius: 200, flicker: 0.03 });
    paperGrain(this, 0.12);

    // the hill lives in one container pivoted at its base, so lean tilts everything together
    this.hill = this.add.container(CX, BASE_Y).setDepth(500);

    this.guide = this.add.graphics().setDepth(600);

    this.petals = this.add
      .particles(0, 0, 'petal', {
        lifespan: 2400, speedX: { min: -220, max: 220 }, speedY: { min: -360, max: -120 }, gravityY: 380,
        rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
      })
      .setDepth(830);

    this.input.setDefaultCursor('default');
    this.input.on('pointerdown', () => this.drop());
    this.input.keyboard.on('keydown-SPACE', () => this.drop());
    this.input.keyboard.on('keydown-ENTER', () => this.drop());

    this.say = text(this, W / 2, 96, '', { size: 28, color: CSS.cream, depth: 906 });
    this.buildHud();

    // how to play: the building only starts once the player says "Got it"
    instructions(this, { kicker: 'DAY 4  ·  NIGHT 4', title: NIGHTS[4].name, sub: NIGHTS[4].goal }, () => this.startLevel());
  }

  startLevel() {
    this.started = true;
    this.PLAN = plan(); // exposed flow: what each next swing brings
    this.hint = hintPill(this, 'Click, tap or press Space to drop the offering  ·  land it near the centre', H - 44);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
    this.time.delayedCall(600, () => this.spawn());
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const g = this.add.graphics().setDepth(900);
    tornPaper(g, 18, 16, 172, 58, { seed: 21, amp: 2 });
    this.offerText = text(this, 104, 46, `0 / ${NEED}`, { size: 28, color: CSS.indigo, bold: true, shadow: false, depth: 906 });
    // evening bar
    const bw = 300;
    const bx = W - 18 - bw;
    tornPaper(g, bx, 16, bw, 58, { seed: 9, amp: 2 });
    this.barX = bx + 28;
    this.barW = bw - 56;
    const c1 = Phaser.Display.Color.ValueToColor(COLORS.turmeric);
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
    this.marker = this.add.graphics().setDepth(906);
    this.marker.fillStyle(COLORS.soot, 1).fillCircle(0, 0, 13);
    this.marker.fillStyle(COLORS.turmeric, 1).fillCircle(0, 0, 10);
    this.marker.fillStyle(0xfff3cf, 1).fillCircle(0, 0, 5);
    this.marker.setPosition(this.barX, 46);
    text(this, bx + bw / 2, 26, 'evening', { size: 15, color: CSS.indigo, shadow: false, depth: 906 });
  }

  // ---------------------------------------------------------------- the swing
  spawn() {
    if (this.over || !this.started) return;
    const spec = this.PLAN[this.landed.length];
    this.swap = { key: spec.key, w: spec.w };
    const tex = this.textures.get(spec.key).getSourceImage();
    this.swap.h = tex.height * (spec.w / tex.width) * SQ[spec.key];
    this.item = this.add.image(W / 2, SWING_Y, spec.key).setDepth(540);
    const s = spec.w / tex.width;
    this.item.setScale(s, s * SQ[spec.key]);
    this.ph = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.phase = 'swing';
    this.say.setText(NAMES[spec.key]);
  }

  drop() {
    if (this.phase !== 'swing' || !this.started || this.over) return;
    this.phase = 'fall';
    // carry the swing's speed with the drop, but cap it so it stays fair
    this.vx = Phaser.Math.Clamp(SWING_AMP * SWING_W * Math.cos(this.ph), -V_MAX, V_MAX);
    this.vy = 0;
    Sfx.whoosh();
  }

  resolve() {
    const spec = this.PLAN[this.landed.length];
    const landY = BASE_Y - this.landed.length * DROP;
    this.item.y = landY - this.swap.h / 2;
    const topW = this.landed.length ? this.landed[this.landed.length - 1].spec.w : 470;
    // with the hill leaning, the axis at this height has drifted sideways from the base
    const topX = CX + Math.sin(Phaser.Math.DegToRad(this.displayLean)) * (BASE_Y - landY);
    const dx = this.item.x - topX;
    const catchW = topW * 0.5 + this.swap.w * 0.25;
    if (Math.abs(dx) > catchW) return this.splat(dx);
    const wx = topX + Phaser.Math.Clamp(dx, -(topW * 0.5 - 12), topW * 0.5 - 12);
    const spr = this.placeLayer(spec, wx, landY);
    this.landed.push({ spr, spec });
    this.item.destroy();
    this.item = null;
    this.offerText.setText(`${Math.min(this.landed.length, NEED)} / ${NEED}`);
    // a solid centre drop steadies the hill; a sloppy one leans it further
    if (Math.abs(dx) < PERFECT) {
      this.lean *= 0.5;
      Sfx.chime();
      this.petals.explode(8, wx, landY - 24);
    } else {
      this.lean += (wx - topX) * LEAN_PER_PX;
      Sfx.land();
    }
    if (this.landed.length >= this.PLAN.length) {
      this.phase = 'settle';
      this.time.delayedCall(450, () => this.win(wx, landY, this.swap.h));
      return;
    }
    this.phase = 'settle';
    if (Math.abs(this.lean) > LEAN_MAX) {
      this.time.delayedCall(420, () => this.topple());
      return;
    }
    this.time.delayedCall(420, () => this.spawn());
  }

  placeLayer(spec, wx, landY) {
    const tex = this.textures.get(spec.key).getSourceImage();
    const s = spec.w / tex.width;
    const spr = this.add.image(0, 0, spec.key).setOrigin(0.5, 1).setScale(s, s * SQ[spec.key]);
    const l = this.toLocal(wx, landY);
    spr.setPosition(l.x, l.y);
    this.hill.add(spr); // every new layer draws over the old ones
    return spr;
  }

  // where a world point lands inside the (possibly leaning) hill container
  toLocal(x, y) {
    const v = new Phaser.Math.Vector2(x - CX, y - BASE_Y);
    v.rotate(-Phaser.Math.DegToRad(this.displayLean));
    return v;
  }

  // the offering missed the hill entirely: it lands beside it, no death, just lost seconds
  splat(dx) {
    this.miss++;
    const spr = this.item;
    this.item = null;
    const side = Math.sign(dx) || 1;
    Sfx.hit();
    this.tweens.add({
      targets: spr, y: BASE_Y + 14, scaleY: spr.scaleY * 0.4, angle: side * 14, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => this.tweens.add({ targets: spr, alpha: 0, delay: 500, duration: 500, onComplete: () => spr.destroy() }),
    });
    this.phase = 'settle';
    this.time.delayedCall(650, () => this.spawn());
  }

  // lean past the limit: the top layers slide off (soft fail — the hill keeps its lower half)
  topple() {
    if (this.over || this.landed.length === 0) return;
    this.phase = 'topple';
    const n = Math.min(2, this.landed.length);
    const lost = this.landed.splice(this.landed.length - n, n);
    const dir = Math.sign(this.lean) || 1;
    lost.forEach((l, i) => {
      const spr = l.spr;
      if (!spr) return;
      this.tweens.add({
        targets: spr, x: spr.x + dir * (160 + i * 60), y: spr.y + 210, angle: dir * 26, alpha: 0, duration: 760, ease: 'Quad.easeIn',
        onComplete: () => spr.destroy(),
      });
    });
    this.lean *= 0.28;
    Sfx.fail();
    this.say.setText('Too steep — the top slid off!');
    this.time.delayedCall(820, () => {
      this.offerText.setText(`${Math.min(this.landed.length, NEED)} / ${NEED}`);
      this.spawn();
    });
  }

  // ---------------------------------------------------------------- done
  win(wx, landY, h) {
    if (this.over) return;
    this.over = true;
    Sfx.fanfare();
    this.say.setText('');
    // the maha-deep burns at the crown
    this.flame = new FlameCluster(this, 1, { size: 54, depth: 640 });
    this.flame.setPosition(wx, landY - h * 0.34);
    this.add.particles(0, 0, 'ember', {
      lifespan: { min: 700, max: 1300 }, speedY: { min: -40, max: -90 }, speedX: { min: -20, max: 20 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 130,
    }).setDepth(645).startFollow(this.flame, 0, -26);
    const glow = this.add.image(wx, landY - h * 0.4, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(630).setAlpha(0).setScale(4);
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 6, duration: 1400 });
    this.tweens.add({ targets: this.hillLight, radius: 560, duration: 1600 });
    this.tweens.add({ targets: this, ambient: 0.34, duration: 1800 });
    this.petals.explode(60, CX, BASE_Y - 280);
    const t = titleText(this, W / 2, 250, 'The hill is crowned.', { size: 64, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 236, duration: 900 });
    const left = Math.max(0, Math.round(DURATION - this.t));
    this.time.delayedCall(4200, () => {
      completeNight(4, { offerings: NEED, splats: this.miss });
      go(this, 'StoryCard', {
        night: 4,
        card: { ...NIGHTS[4].card, bg: NIGHTS[4].bg },
        stats: [
          { label: 'Offerings', value: `${NEED}/${NEED}` },
          { label: 'Splats', value: `${this.miss}` },
          { label: 'Evening to spare', value: `${left}s` },
        ],
        next: NIGHTS[4].next,
        wicksBefore: 4,
      });
    });
  }

  lose() {
    if (this.over) return;
    this.over = true;
    if (this.item) {
      this.item.destroy();
      this.item = null;
    }
    Sfx.fail();
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.45).setOrigin(0).setDepth(940);
    titleText(this, W / 2, 250, 'The evening ended…', { size: 64, color: CSS.cream, depth: 950 });
    text(this, W / 2, 316, `${this.landed.length} of ${NEED} offerings were placed. The hill keeps what you built.`, { size: 26, color: CSS.turmeric, depth: 950 });
    button(this, W / 2, 410, 'Try again', () => this.scene.restart(), { w: 300, h: 64, size: 30 });
    button(this, W / 2, 490, 'Back to the start', () => go(this, 'Title'), { w: 300, h: 56, size: 24 });
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.started && !this.over) this.t += dt;

    if (this.phase === 'swing' && this.item) {
      this.ph += SWING_W * dt;
      this.item.x = SWING_CX + SWING_AMP * Math.sin(this.ph);
      this.item.y = SWING_Y + Math.sin(this.ph * 2) * 6;
    } else if (this.phase === 'fall' && this.item) {
      this.vy = Math.min(this.vy + GRAV * dt, FALL_MAX);
      this.item.x += this.vx * dt;
      this.item.y += this.vy * dt;
      if (this.item.y + this.swap.h / 2 >= BASE_Y - this.landed.length * DROP) this.resolve();
    }

    // the hill eases toward its lean instead of snapping
    this.displayLean += (this.lean - this.displayLean) * Math.min(1, dt * 6);
    this.hill.angle = this.displayLean;

    this.drawGuide();
    this.flame?.update?.(time);

    const k = Math.min(1, this.t / DURATION);
    this.marker.x = this.barX + this.barW * k;
    this.light.ambient = this.ambient;
    this.light.update(time);

    if (!this.over && this.started && this.t >= DURATION) this.lose();
  }

  drawGuide() {
    const g = this.guide;
    g.clear();
    if ((this.phase !== 'swing' && this.phase !== 'fall') || !this.item) return;
    const landY = BASE_Y - this.landed.length * DROP;
    const topX = CX + Math.sin(Phaser.Math.DegToRad(this.displayLean)) * (BASE_Y - landY);
    const topW = this.landed.length ? this.landed[this.landed.length - 1].spec.w : 470;
    // the ledge it can still catch
    g.lineStyle(3, COLORS.cream, 0.35);
    g.strokeEllipse(topX, landY - 4, topW * 0.9 + this.swap.w * 0.5, 26);
    // the drop carries the swing's speed, so show where it will actually land
    const vx = this.phase === 'fall' ? this.vx : Phaser.Math.Clamp(SWING_AMP * SWING_W * Math.cos(this.ph), -V_MAX, V_MAX);
    const d = Math.max(0, landY - this.item.y);
    const tFall = Math.sqrt((2 * d) / GRAV);
    const px = Phaser.Math.Clamp(this.item.x + vx * tFall, 30, W - 30);
    g.fillStyle(COLORS.cream, 0.28);
    for (let i = 1; i <= 7; i++) {
      const f = i / 8;
      const y = this.item.y + d * f;
      const x = this.item.x + vx * Math.sqrt((2 * Math.max(0, y - this.item.y)) / GRAV);
      g.fillCircle(x, y, 2.4);
    }
    g.lineStyle(3, COLORS.cream, 0.5);
    g.strokeEllipse(px, landY - 4, this.swap.w * 0.55, 16);
  }
}
