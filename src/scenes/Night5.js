import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS, NIGHT_LEVEL } from '../data/nights.js';
import { Album } from '../systems/album.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { FlameCluster } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { finish, stepNoise } from '../systems/Motion.js';
import { text, titleText, hintPill, instructions, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys, hudButtons, loseScreen, canvasOnly, reviewerControls, labelPill } from '../ui/ui.js';

// ---- tuning -------------------------------------------------------------
const ROUNDS = [1, 2, 3, 4, 5, 6]; // colours Yamuna shows in each of the six rounds: every round lays one blossom of the tika
const MAX_MISTAKES = 3; // three slips and Yama arrives
const TIME_LIMIT = 120; // seconds before Yama reaches the door of the room anyway
const TASK_BONUS = 14; // seconds Yama is pushed back each time a ritual task is done
const STEP = 620; // ms between the colours Yamuna points to
const TAP_RADIUS = 70; // px; piles are ~77 px apart, so a fingertip rarely misses
const INPUT_DELAY = 380; // ms after the last colour flashes before you can start tapping (the flash itself lasts ~500)
const GARLAND_W = 140; // its original size was right; only its glow was boosted
const FRUIT_W = 215; // the dry fruits are the ones that were hard to spot, so they stay larger
// ---------------------------------------------------------------------------

// the seven powders on the thali, as fractions of the thali picture
const PILES = [
  { name: 'red', col: 0xc8302b, fx: 135 / 560, fy: 145 / 372 },
  { name: 'yellow', col: 0xf0c830, fx: 212 / 560, fy: 110 / 372 },
  { name: 'green', col: 0x6b8f3a, fx: 310 / 560, fy: 100 / 372 },
  { name: 'blue', col: 0x25305f, fx: 402 / 560, fy: 125 / 372 },
  { name: 'purple', col: 0x8a3070, fx: 415 / 560, fy: 205 / 372 },
  { name: 'orange', col: 0xf08a20, fx: 310 / 560, fy: 225 / 372 },
  { name: 'white', col: 0xf0e8d8, fx: 200 / 560, fy: 210 / 372 },
];
// the tika on his forehead, one stripe per round
// The tika as it really looks: a yellow bar down the forehead with six blossoms of colour, top to bottom.
const TIKA = [0xd3232b, 0x6a35b8, 0xd62a73, 0x5fa22e, 0xc9201f, 0xf5f3ee]; // red, purple, pink, green, red, white

/** A fluffy blossom of powder (a darker body, petals and a highlight), like the ones in a real tika. */
function blossom(g, x, y, r, color, k = 1) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const shade = (f) => Phaser.Display.Color.GetColor(Math.min(255, c.red * f), Math.min(255, c.green * f), Math.min(255, c.blue * f));
  g.fillStyle(shade(0.62), 1).fillCircle(x, y + r * 0.08 * k, r * k);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    g.fillStyle(i % 2 ? shade(1) : shade(1.12), 1).fillCircle(x + Math.cos(a) * r * 0.5 * k, y + Math.sin(a) * r * 0.5 * k, r * 0.52 * k);
  }
  g.fillStyle(shade(1.22), 1).fillCircle(x - r * 0.15 * k, y - r * 0.15 * k, r * 0.3 * k);
}

/** The yellow bar the blossoms sit on. */
function tikaBar(g, cx, top, w, h) {
  g.fillStyle(0xcfae22, 1).fillRoundedRect(cx - w / 2 - 1.5, top + 2, w + 3, h, w * 0.25);
  g.fillStyle(0xf6e24a, 1).fillRoundedRect(cx - w / 2, top, w, h, w * 0.22);
  g.fillStyle(0xfff59a, 0.85).fillRoundedRect(cx - w * 0.3, top + 3, w * 0.2, Math.max(2, h - 6), w * 0.1);
}

const THALI = { x: 640, y: 584, w: 430 };
const KEEPER = { x: 318, y: 724, h: 520 };
const YAMUNA = { x: 900, y: 724, h: 540 };
const FOREHEAD = { fx: 0.5, fy: 0.138 }; // as fractions of the Keeper picture
// Yama waits at the door and steps closer as the danger grows
const YAMA_STAGES = [
  { a: 0, x: 1220, h: 380, mix: 0 },
  { a: 0.6, x: 1196, h: 410, mix: 0 },
  { a: 1, x: 1150, h: 470, mix: 0.5 },
  { a: 1, x: 1096, h: 540, mix: 1 },
];

export default class Night5 extends Phaser.Scene {
  constructor() {
    super('Night5');
  }

  init() {
    this._leaving = false;
    this.phase = 'intro'; // intro -> show -> input -> between -> won / lost
    this.round = 0;
    this.mistakes = 0;
    this.seq = [];
    this.inputIdx = 0;
    this.t = 0;
    this.threat = 0;
    this.stage = 1; // Yama is already at the door from the start
    this.ambientBase = 0.34;
    this.slips = 0; // every wrong colour counted (the dry fruits forgive one, but the record keeps it)
    this.tasks = { garland: false, fruit: false };
    this.taskKind = null;
    this.tikaP = 0;
    this.tikaShown = 0;
    this.tikaDone = false;
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
    Sfx.setLevel(NIGHT_LEVEL[5]);
    coverBg(this, 'bg_n5', 0);

    this.light = new Lighting(this, { depth: 800, ambient: this.ambientBase });
    finish(this);
    paperGrain(this, 0.1);

    // the Keeper, brother, holding the five-wick diya
    this.keeper = this.add.image(KEEPER.x, KEEPER.y, 'keeper').setOrigin(0.5, 1).setDepth(200);
    this.keeper.setScale(KEEPER.h / this.keeper.height);
    this.flames = new FlameCluster(this, 5, { size: 74, depth: 760, spread: 0.3, glow: false });
    const kdw = this.keeper.displayWidth;
    const kdh = this.keeper.displayHeight;
    this.flames.setPosition(KEEPER.x + (0.47 - 0.5) * kdw, KEEPER.y - kdh * (1 - 0.405));
    this.kLight = this.light.add({ x: this.flames.x, y: this.flames.y - 40, radius: 330, flicker: 0.05 });
    // a soft warm shadow behind the five flames: on the pale shawl they used to disappear
    this.add.image(this.flames.x, this.flames.y + 6, 'light').setTint(0x3a1a08).setAlpha(0.38).setScale(0.42, 0.52).setDepth(757);
    this.add.image(this.flames.x, this.flames.y - 30, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.4).setAlpha(0.5).setDepth(759);
    this.stripes = this.add.graphics().setDepth(210);
    // the ritual: a garland for the brother, dry fruits for Yama (placeholders until finished art exists)
    this.makeMala();
    this.garland = this.add.image(0, 0, 'mala_u').setOrigin(0.5, 0).setDepth(330).setAlpha(0);
    this.garland.setScale(GARLAND_W / this.garland.width);
    this.plate = this.add.image(0, 0, 'dry_fruit_plate').setDepth(330).setAlpha(0);
    this.plate.setScale(FRUIT_W / this.plate.width);
    // Yama's shadow creeps across the floor toward the thali as the danger grows
    this.yShadow = this.add.image(1100, 712, 'light').setTint(0x000000).setOrigin(1, 0.5).setDepth(150).setAlpha(0.16);

    // Yamuna
    this.yamuna = this.add.image(YAMUNA.x, YAMUNA.y, 'yamuna').setOrigin(0.5, 1).setDepth(200);
    this.yamuna.setScale(YAMUNA.h / this.yamuna.height);

    // Yama, at the door
    this.yama = this.add.image(YAMA_STAGES[1].x, 716, 'yama').setOrigin(0.5, 1).setDepth(190);
    this.yamaState = { ...YAMA_STAGES[1] };
    this.applyYama();

    // the thali
    this.thali = this.add.image(THALI.x, THALI.y, 'tika_thali').setDepth(300);
    this.thaliScale = THALI.w / this.thali.width;
    this.thali.setScale(this.thaliScale);
    this.thaliLight = this.light.add({ x: THALI.x, y: THALI.y, radius: 330, flicker: 0.03 });
    this.piles = PILES.map((p) => ({
      ...p,
      x: THALI.x + (p.fx - 0.5) * this.thali.displayWidth,
      y: THALI.y + (p.fy - 0.5) * this.thali.displayHeight,
    }));

    // faint 1-7 labels (same as the keyboard keys) so the colours can be told apart without colour
    this.piles.forEach((p, i) => {
      const dark = [0x25305f, 0x8a3070, 0xc8302b, 0x6b8f3a].includes(p.col);
      text(this, p.x, p.y, String(i + 1), { size: 24, bold: true, color: dark ? '#EFE2C4' : '#1D2540', shadow: false, depth: 312 }).setAlpha(0.55);
    });
    this.input.on('pointerdown', canvasOnly((p) => this.onPointer(p)));
    // the numbered powders work from the keyboard too: 1-7 on the number row or the keypad (Phaser names the keys ONE, TWO...)
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'].forEach((name, i) => {
      this.input.keyboard.on(`keydown-${name}`, () => this.tap(i));
      this.input.keyboard.on(`keydown-NUMPAD_${name}`, () => this.tap(i));
    });
    ['keydown-SPACE', 'keydown-ENTER'].forEach((k) => this.input.keyboard.on(k, () => this.phase === 'task' && this.taskDone(this.taskKind)));
    this.keysTika = this.input.keyboard.addKeys('SPACE,DOWN,S');

    this.petals = this.add
      .particles(0, 0, 'petal', {
        lifespan: 2400, speedX: { min: -220, max: 220 }, speedY: { min: -360, max: -120 }, gravityY: 380,
        rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
      })
      .setDepth(830);

    this.buildHud();
    hudButtons(this, { pause: true });
    reviewerControls(this);
    this.startLevel();
  }

  startLevel() {
    this.hint = hintPill(this, 'Yamuna has a gift for him: drag the garland to your brother (or press Space)', H - 34);
    this.time.delayedCall(10000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
    this.time.delayedCall(700, () => this.startTask('garland'));
  }

  buildHud() {
    const g = this.add.graphics().setDepth(900);
    tornPaper(g, 18, 16, 6 * 34 + 36, 58, { seed: 23, amp: 2 });
    this.roundDots = TIKA.map((c, i) =>
      this.add.circle(18 + 36 + i * 34, 46, 10, c, 1).setDepth(905).setAlpha(0.25).setStrokeStyle(2, COLORS.soot, 0.7),
    );
    // how many slips are left
    tornPaper(g, W - 18 - 250, 16, 250, 58, { seed: 27, amp: 2 });
    text(this, W - 18 - 250 + 62, 46, 'Yama', { size: 22, color: CSS.indigo, bold: true, shadow: false, depth: 906 });
    this.slipDots = [];
    for (let i = 0; i < MAX_MISTAKES; i++) {
      this.slipDots.push(this.add.circle(W - 18 - 250 + 126 + i * 28, 46, 9, COLORS.vermilion, 1).setDepth(905).setStrokeStyle(2, COLORS.soot, 0.7));
    }
    const bgPill = this.add.graphics().setDepth(905);
    tornPaper(bgPill, W / 2 - 280, 86, 560, 46, { seed: 31, amp: 1.6 });
    this.status = text(this, W / 2, 109, '', { size: 26, color: CSS.indigo, shadow: false, depth: 906 });
    this.statusPill = bgPill;
    bgPill.setAlpha(0);
  }

  setStatus(str) {
    this.status.setText(str);
    this.statusPill.setAlpha(str ? 1 : 0);
  }

  // ---------------------------------------------------------------- rounds
  newRound() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    if (this.round === 0 && !this.toldRounds) {
      this.toldRounds = true;
      this.hideHints();
      this.hint2 = hintPill(this, 'Watch Yamuna point, then tap the same colours in the same order (or press 1 to 7)', H - 34);
      this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint2, alpha: 0, duration: 600 }));
    }
    const len = ROUNDS[this.round];
    this.seq = [];
    for (let i = 0; i < len; i++) {
      let n;
      do n = Phaser.Math.Between(0, 6);
      while (i > 0 && n === this.seq[i - 1]);
      this.seq.push(n);
    }
    this.showSequence();
  }

  showSequence() {
    this.phase = 'show';
    this.inputIdx = 0;
    this.setStatus(this.round === 0 ? 'Watch the thali…' : 'Watch again…');
    this.tweens.add({ targets: this.yamuna, y: YAMUNA.y - 10, yoyo: true, duration: 220 });
    this.seq.forEach((n, i) => this.time.delayedCall(700 + i * STEP, () => this.flash(n, true)));
    this.time.delayedCall(700 + (this.seq.length - 1) * STEP + INPUT_DELAY, () => {
      if (this.phase !== 'show') return;
      this.phase = 'input';
      this.setStatus('Your turn');
    });
  }

  flash(i, note) {
    const p = this.piles[i];
    if (note) Sfx.note(i);
    const glow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(p.col === 0x25305f ? 0x7aa0ff : p.col).setDepth(310).setScale(1.5).setAlpha(1);
    const ring = this.add.circle(p.x, p.y, 40, 0xffffff, 0).setStrokeStyle(5, 0xfff3cf, 1).setDepth(311);
    this.tweens.add({ targets: glow, alpha: 0, scale: 2.3, duration: 520, onComplete: () => glow.destroy() });
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.5, duration: 520, onComplete: () => ring.destroy() });
  }

  onPointer(ptr) {
    if (this.phase !== 'input') return;
    let best = -1;
    let bd = 1e9;
    this.piles.forEach((p, i) => {
      const d = Math.hypot(ptr.worldX - p.x, (ptr.worldY - p.y) * 1.2);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (bd < TAP_RADIUS) this.tap(best);
  }

  tap(i) {
    if (this.phase !== 'input') return;
    this.flash(i, true);
    if (i === this.seq[this.inputIdx]) {
      this.inputIdx++;
      if (this.inputIdx >= this.seq.length) this.roundDone();
    } else this.mistake();
  }

  roundDone() {
    this.phase = 'between';
    this.roundDots[this.round].setAlpha(1);
    this.tweens.add({ targets: this.roundDots[this.round], scale: 1.5, yoyo: true, duration: 220 });
    this.round++;
    const last = this.round >= ROUNDS.length;
    this.drawStripes(last ? this.round - 1 : this.round); // the last colour is laid in the close-up
    Sfx.chime();
    // "One last colour…" should announce the final round one step ahead, not after it is done
    if (!last) this.setStatus(this.round === ROUNDS.length - 1 ? 'One last colour…' : 'Beautiful. Another colour…');
    this.tweens.add({ targets: this.yamuna, y: YAMUNA.y - 12, yoyo: true, duration: 240 });
    if (last) this.time.delayedCall(1100, () => this.tikaClose());
    else if (this.round === 3 && !this.tasks.fruit) {
      if (this.mistakes === 0) {
        // centred under the status banner: at the top right it sat on top of Yama's mistake counter
        const msgPill = labelPill(this, W / 2, 166, 'Doing well? Try a wrong colour to see what happens.', { size: 20, depth: 906, fit: ['Doing well? Try a wrong colour to see what happens.'] });
        msgPill.label.setColor(CSS.indigo);
        this.time.delayedCall(6000, () => this.tweens.add({ targets: msgPill.container, alpha: 0, duration: 500, onComplete: () => msgPill.container.destroy() }));
      }
      this.time.delayedCall(1500, () => this.newRound());
    }
    else if (this.round === 4 && !this.tasks.fruit) {
      this.time.delayedCall(1300, () => this.startTask('fruit'));
    }
    else this.time.delayedCall(1500, () => this.newRound());
  }

  mistake() {
    this.phase = 'between';
    this.mistakes++;
    this.slips++;
    Sfx.fail();
    this.cameras.main.shake(160, 0.004);
    const dot = this.slipDots[this.mistakes - 1];
    if (dot) this.tweens.add({ targets: dot, alpha: 0.15, duration: 300 });
    this.tweens.add({ targets: this.thali, angle: { from: -2, to: 2 }, yoyo: true, repeat: 2, duration: 70, onComplete: () => this.thali.setAngle(0) });
    this.updateThreat();
    if (this.phase === 'lost') return;
    this.setStatus('Wrong colour. Yama steps closer…');
    this.time.delayedCall(1500, () => {
      if (this.phase === 'between') this.showSequence();
    });
  }

  // ---------------------------------------------------------------- ritual tasks
  /** kind: 'garland' (drag it to the brother) or 'fruit' (drag the plate to Yama). Space does it for you. */
  hideHints() {
    [this.hint, this.hint2].forEach((h) => h && this.tweens.add({ targets: h, alpha: 0, duration: 300 }));
  }

  startTask(kind) {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.phase = 'task';
    if (kind === 'fruit') this.hideHints();
    this.taskKind = kind;
    const item = kind === 'garland' ? this.garland : this.plate;
    const home = kind === 'garland' ? { x: YAMUNA.x - 100, y: 470 } : { x: YAMUNA.x - 70, y: 524 };
    const fullScale = kind === 'garland' ? GARLAND_W / item.width : FRUIT_W / item.width;
    item.setPosition(home.x, home.y).setAlpha(0);
    item._home = home;
    if (kind === 'fruit') {
      // the fruit plate grows into the room; the garland keeps its original size
      item.setScale(fullScale * 0.82);
      this.tweens.add({ targets: item, alpha: 1, scale: fullScale, duration: 650, ease: 'Back.easeOut' });
    } else {
      item.setScale(fullScale);
      this.tweens.add({ targets: item, alpha: 1, duration: 500 });
    }
    this.setStatus(kind === 'garland' ? 'Drag the garland to your brother (Space)' : 'Offer Yama the dry fruits (drag or Space)');
    const z = this.zone(kind);
    this.taskRing = this.add.image(z.x, z.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.8).setAlpha(0.5).setDepth(305);
    this.tweens.add({ targets: this.taskRing, alpha: 0.85, scale: 3.2, yoyo: true, repeat: -1, duration: 700 });
    this.taskGlow = this.add.image(home.x, home.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9b8).setScale(2.5).setAlpha(0.5).setDepth(item.depth - 1);
    this.tweens.add({ targets: this.taskGlow, alpha: 0.95, scale: 3.5, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
    this.bob = this.tweens.add({ targets: item, y: home.y - 8, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
    item.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(item);
    item.removeAllListeners('drag');
    item.removeAllListeners('dragstart');
    item.removeAllListeners('dragend');
    item.on('dragstart', () => this.bob?.stop());
    item.on('drag', (p, x, y) => { item.setPosition(x, y); this.taskGlow?.setPosition(x, y); });
    item.on('dragend', () => {
      if (this.phase !== 'task') return;
      this.taskDone(kind);
    });
    item.on('pointerdown', () => { if (this.phase === 'task') this.taskDone(kind); });
    Sfx.chime();
    this.time.delayedCall(9000, () => this.phase === 'task' && this.setStatus('…or press Space'));
  }

  zone(kind) {
    if (kind === 'garland') return { x: KEEPER.x, y: KEEPER.y - this.keeper.displayHeight * 0.62, r: 150 };
    return { x: this.yamaState.x - 40, y: 540, r: 200 };
  }

  taskDone(kind) {
    if (this.phase !== 'task') return;
    this.phase = 'between';
    this.hideHints();
    this.bob?.stop();
    this.taskRing?.destroy();
    this.taskGlow?.destroy();
    this.taskGlow = null;
    this.tasks[kind] = true;
    const item = kind === 'garland' ? this.garland : this.plate;
    item.disableInteractive();
    if (kind === 'garland') {
      // the garland settles around his shoulders (placeholder: a flat garland; a "worn" overlay would look better)
      const wearY = KEEPER.y - this.keeper.displayHeight * 0.62 - 40;
      item.setDepth(215);
      this.add.image(KEEPER.x, wearY + 24, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe0a0).setScale(1.9).setAlpha(0.42).setDepth(214);
      this.tweens.add({ targets: item, x: KEEPER.x, y: wearY, scale: GARLAND_W / item.width, angle: 0, duration: 450, ease: 'Back.easeOut' });
      this.setStatus('He wears the garland. Now the tika…');
    } else {
      // Yama accepts the dry fruits and forgives one slip
      this.tweens.add({ targets: item, x: this.yamaState.x - 60, y: 560, scale: item.scale * 0.8, alpha: 0, duration: 800, delay: 200 });
      if (this.mistakes > 0) {
        this.mistakes--;
        this.slipDots[this.mistakes]?.setAlpha(1);
      }
      this.setStatus('Yama is touched. He waits a little longer.');
    }
    this.t = Math.max(0, this.t - TASK_BONUS);
    this.updateThreat();
    this.petals.explode(26, item.x, item.y - 40);
    Sfx.shimmer();
    this.time.delayedCall(1700, () => this.newRound());
  }

  // ---------------------------------------------------------------- the garland
  /** A garland of magenta makhamali flowers with a few marigolds, hanging in a U: drawn in code (a placeholder for finished art). */
  makeMala() {
    if (this.textures.exists('mala_u')) return;
    const w = 260;
    const h = 124;
    const tex = this.textures.createCanvas('mala_u', w, h);
    const x = tex.getContext();
    const pt = (t) => ({ px: 14 + (w - 28) * t, py: 14 + 72 * Math.sin(Math.PI * t) });
    x.strokeStyle = '#5a2a3a';
    x.lineWidth = 3;
    x.beginPath();
    for (let i = 0; i <= 60; i++) {
      const { px, py } = pt(i / 60);
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
    const flowers = [];
    let last = pt(0);
    let acc = 0;
    for (let i = 1; i <= 400; i++) {
      const p = pt(i / 400);
      acc += Math.hypot(p.px - last.px, p.py - last.py);
      last = p;
      if (acc >= 15) {
        acc = 0;
        flowers.push(p);
      }
    }
    const cols = [['#c51f6b', '#ea4090', '#ff8fc4'], ['#b81a61', '#dd3687', '#f979b8']];
    flowers.forEach((p, i) => {
      const marigold = i % 7 === 3;
      const [dark, mid, light] = marigold ? ['#d9762f', '#ffb347', '#ffe08a'] : cols[i % 2];
      x.fillStyle = dark;
      x.beginPath();
      x.arc(p.px, p.py, 10.5, 0, Math.PI * 2);
      x.fill();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + i;
        x.fillStyle = k % 2 ? mid : light;
        x.beginPath();
        x.arc(p.px + Math.cos(a) * 5.4, p.py + Math.sin(a) * 5.4, 5.2, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = marigold ? '#c8432b' : '#f9a5c8';
      x.beginPath();
      x.arc(p.px, p.py, 2.6, 0, Math.PI * 2);
      x.fill();
    });
    const b = pt(0.5); // a small marigold tassel at the bottom
    [[-8, 0], [0, 6], [8, 0]].forEach(([dx, dy]) => {
      x.fillStyle = '#f2a33a';
      x.beginPath();
      x.arc(b.px + dx, b.py + 17 + dy, 5, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#c8432b';
      x.beginPath();
      x.arc(b.px + dx, b.py + 17 + dy, 1.8, 0, Math.PI * 2);
      x.fill();
    });
    tex.refresh();
  }

  // ---------------------------------------------------------------- the tika close-up
  /** The climax: a close-up of his forehead. Swipe down it (or hold Space / the down arrow): the yellow bar is laid and six blossoms of colour appear along it. */
  tikaClose() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.phase = 'tika';
    this.hideHints();
    this.tikaP = 0;
    this.tikaDone = false;
    this.tikaPop = [];
    this.setStatus('');
    Sfx.chime();
    const ui = this.add.container(0, 0).setDepth(920);
    this.tikaUI = ui;
    const veil = this.add.rectangle(0, 0, W, H, 0x120f1c, 0.88).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: veil, alpha: 0.88, duration: 500 });
    const img = this.add.image(0, 0, 'keeper').setOrigin(0, 0);
    const tw = img.width;
    const th = img.height;
    const cropX = tw * 0.2;
    const cropW = tw * 0.6;
    const cropH = th * 0.3;
    const s = Math.min(560 / cropW, 440 / cropH);
    img.setCrop(cropX, 0, cropW, cropH).setScale(s);
    const left = W / 2 - (cropW * s) / 2;
    const top = 134;
    img.setPosition(left - cropX * s, top);
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.soot, 0.5).fillRoundedRect(left - 6, top - 4, cropW * s + 22, cropH * s + 22, 20);
    frame.lineStyle(10, COLORS.cream, 1).strokeRoundedRect(left - 8, top - 8, cropW * s + 16, cropH * s + 16, 18);
    const fy = top + FOREHEAD.fy * th * s + 6;
    const fx = left - cropX * s + FOREHEAD.fx * tw * s;
    this.tikaLayout = { fx, top: fy - 100, h: 138, bw: 30, r: 13.5 };
    const L = this.tikaLayout;
    this.tikaG = this.add.graphics();
    // a dashed arrow beside the face: swipe this way
    const gx = left + cropW * s - 26;
    const guide = this.add.graphics();
    guide.lineStyle(4, COLORS.turmeric, 0.85);
    for (let y = L.top - 10; y < L.top + L.h + 24; y += 20) guide.lineBetween(gx, y, gx, y + 10);
    guide.fillStyle(COLORS.turmeric, 0.95).fillTriangle(gx, L.top + L.h + 50, gx - 11, L.top + L.h + 26, gx + 11, L.top + L.h + 26);
    const title = titleText(this, W / 2, 96, 'The tika', { size: 38, color: CSS.turmeric, depth: 0 });
    const hint = text(this, W / 2, H - 66, 'Swipe down his forehead  ·  or hold Space / the down arrow', { size: 26, color: CSS.cream, depth: 0 });
    this.tikaFinger = this.add.circle(0, 0, 20, COLORS.cream, 0.9).setStrokeStyle(4, COLORS.soot, 0.8).setVisible(false);
    ui.add([veil, frame, img, this.tikaG, guide, title, hint, this.tikaFinger]);
    ui.setAlpha(0);
    this.tweens.add({ targets: ui, alpha: 1, duration: 500 });
    this.tikaPointerDown = false;
    this.tikaMove = (p) => {
      if (this.phase !== 'tika' || this.tikaDone) return;
      this.tikaFinger.setPosition(p.worldX, p.worldY).setVisible(true);
      if (!p.isDown) { this.tikaPointerDown = false; return; }
      this.tikaPointerDown = true;
      const u = Phaser.Math.Clamp((p.worldY - (L.top - 24)) / (L.h + 48), 0, 1);
      this.tikaP = Math.max(this.tikaP, Math.min(u, this.tikaP + 0.45)); // a tap at the bottom cannot skip the swipe
    };
    this.input.on('pointermove', this.tikaMove);
    this.input.on('pointerdown', this.tikaMove);
    this.input.on('pointerup', () => { this.tikaPointerDown = false; });
  }

  updateTika(dt) {
    if (!this.tikaLayout || this.tikaDone) return;
    const kb = this.keysTika;
    if (kb.SPACE.isDown || kb.DOWN.isDown || kb.S.isDown || this.autoPlay) this.tikaP = Math.min(1, this.tikaP + dt * (this.autoPlay ? 0.9 : 0.4));
    if (this.tikaPointerDown) this.tikaP = Math.min(1, this.tikaP + dt * 0.5);
    const L = this.tikaLayout;
    const g = this.tikaG;
    g.clear();
    const reach = L.h * Math.min(1, this.tikaP * 1.04); // the yellow reaches further down as you swipe
    if (reach > 2) tikaBar(g, L.fx, L.top, L.bw, reach);
    for (let i = 0; i < 6; i++) {
      const cy = L.top + (i + 0.5) * (L.h / 6);
      if (reach < cy - L.top - 4) continue; // the swipe has not reached this blossom yet
      if (this.tikaPop[i] === undefined) {
        this.tikaPop[i] = this.time.now;
        Sfx.note(i);
        this.petals.explode(5, L.fx, cy);
      }
      const age = Math.min(1, (this.time.now - this.tikaPop[i]) / 260);
      blossom(g, L.fx, cy, L.r, TIKA[i], age < 1 ? Phaser.Math.Easing.Back.Out(age) : 1);
    }
    if (this.tikaP >= 0.999) {
      this.tikaDone = true;
      this.input.off('pointermove', this.tikaMove);
      this.input.off('pointerdown', this.tikaMove);
      Sfx.fanfare();
      this.tweens.add({
        targets: this.tikaUI, alpha: 0, duration: 700, delay: 2100,
        onComplete: () => {
          this.tikaUI.destroy();
          this.drawStripes(6);
          this.win();
        },
      });
    }
  }

  // ---------------------------------------------------------------- Yama
  updateThreat() {
    this.threat = Math.max(this.mistakes / MAX_MISTAKES, this.t / TIME_LIMIT);
    if (this.threat >= 1 && this.phase !== 'won' && this.phase !== 'lost') return this.lose();
    // stage 1 = waiting at the door (visible from the start), 2 and 3 = one and two slips closer
    const stage = this.threat < 1 / 3 ? 1 : this.threat < 2 / 3 ? 2 : 3;
    if (stage !== this.stage) {
      this.stage = stage;
      const to = YAMA_STAGES[stage];
      this.tweens.add({ targets: this.yamaState, ...to, duration: 1100, ease: 'Sine.easeInOut', onUpdate: () => this.applyYama() });
      if (stage > 0) Sfx.bell();
    }
  }

  applyYama() {
    const s = this.yamaState;
    this.yama.setScale(s.h / this.yama.height).setX(s.x).setAlpha(s.a);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x05050a), Phaser.Display.Color.ValueToColor(0xffffff), 1, s.mix,
    );
    this.yama.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }

  /** The small tika on his forehead: the yellow bar with one blossom per round done. */
  drawStripes(n = this.round) {
    const g = this.stripes;
    g.clear();
    if (n <= 0) return;
    const k = this.keeper;
    const x0 = KEEPER.x + (FOREHEAD.fx - 0.5) * k.displayWidth;
    const y0 = KEEPER.y - k.displayHeight * (1 - FOREHEAD.fy);
    const h = 42;
    const top = y0 - 18;
    tikaBar(g, x0, top, 11, h);
    for (let i = 0; i < Math.min(6, n); i++) blossom(g, x0, top + (i + 0.5) * (h / 6), 4.8, TIKA[i]);
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    let dt = Math.min(delta / 1000, 0.05);
    if (this.fastPlay) dt *= 2;
    if (!['won', 'lost', 'intro', 'task', 'tika'].includes(this.phase)) {
      this.t += dt; // the clock stops while a ritual task or the tika is under way
      this.updateThreat();
    }
    this.yShadow.setPosition(this.yamaState.x + 90, 712).setScale((220 + 760 * this.threat) / 512, 0.14).setAlpha(0.16 + 0.42 * this.threat);
    if (this.phase === 'tika') this.updateTika(dt);
    if (this.autoPlay) {
      if (this.phase === 'task' && !this._autoTaskPending) {
        this._autoTaskPending = true;
        this.time.delayedCall(400, () => {
          this._autoTaskPending = false;
          if (this.autoPlay && this.phase === 'task') this.taskDone(this.taskKind);
        });
      }
      if (this.phase === 'input') {
        if (this._autoTapCooldown === undefined) this._autoTapCooldown = 0.6;
        this._autoTapCooldown -= dt;
        if (this._autoTapCooldown <= 0 && this.inputIdx < this.seq.length) {
          this.tap(this.seq[this.inputIdx]);
          this._autoTapCooldown = 0.42;
        }
      } else {
        this._autoTapCooldown = undefined;
      }
    }
    this.flames.update(time);
    this.yamuna.setAngle(stepNoise(time, 5, 6) * 0.9);
    this.yama.setAngle(stepNoise(time, 9, 6) * 0.7);
    this.light.ambient = this.ambientBase + (this.phase === 'won' ? 0 : 0.26 * this.threat);
    this.light.update(time);
  }

  // ---------------------------------------------------------------- end states
  win() {
    if (this.phase === 'won') return;
    this.phase = 'won';
    Sfx.fanfare();
    this.setStatus('');
    this.tweens.add({ targets: this, ambientBase: 0.12, duration: 1800 });
    // Yama steps in, pleased, and Yamuna offers him the dry fruits
    this.yama.setTexture('yama_pleased');
    this.tweens.add({ targets: this.yamaState, a: 1, x: 1110, h: 540, mix: 1, duration: 1200, onUpdate: () => this.applyYama() });
    const plate = this.add.image(YAMUNA.x + 20, 500, 'dry_fruit_plate').setDepth(320).setAlpha(0);
    plate.setScale(FRUIT_W / plate.width);
    this.tweens.add({ targets: plate, alpha: 1, x: 1010, y: 520, duration: 1400, delay: 600, ease: 'Sine.easeInOut' });
    const plateGlow = this.add.image(YAMUNA.x + 20, 500, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9b8).setScale(2.8).setAlpha(0).setDepth(319);
    this.tweens.add({ targets: plateGlow, alpha: 0.5, x: 1010, y: 520, duration: 1400, delay: 600, ease: 'Sine.easeInOut' });
    this.petals.explode(40, YAMUNA.x, 380);
    const t = titleText(this, W / 2, 190, 'Yama is pleased.', { size: 60, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 400 });
    this.time.delayedCall(1500, () => Album.capture(this, 5));
    const boon = text(this, W / 2, 250, 'A sister’s tika, a long life. Every brother is guarded today.', { size: 28, color: CSS.turmeric, depth: 950, bold: true }).setAlpha(0);
    this.tweens.add({ targets: boon, alpha: 1, duration: 900, delay: 1800 });
    this.time.delayedCall(3500, () => {
      completeNight(5, { mistakes: this.slips });
      go(this, 'StoryCard', {
        night: 5,
        card: { ...NIGHTS[5].card, bg: NIGHTS[5].bg },
        stats: [
          { label: 'Colours of tika', value: '7/7' },
          { label: 'Slips', value: String(this.slips) },
        ],
        next: NIGHTS[5].next,
        wicksBefore: 5,
      });
    });
  }

  lose() {
    if (this.phase === 'lost' || this.phase === 'won') return;
    this.phase = 'lost';
    Sfx.fail();
    this.setStatus('');
    this.tweens.add({ targets: this.yamaState, ...YAMA_STAGES[3], duration: 600, onUpdate: () => this.applyYama() });
    loseScreen(this, 'Yama arrived too soon…', `The tika had ${this.round} of 7 colours. Yamuna will try again.`, { size: 58 });
  }
}
