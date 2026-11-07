import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { FlameCluster } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { finish, stepNoise } from '../systems/Motion.js';
import { text, titleText, hintPill, instructions, tornPaper, go, fadeIn, coverBg, paperGrain, globalKeys, hudButtons, loseScreen, canvasOnly } from '../ui/ui.js';

// ---- tuning -------------------------------------------------------------
const ROUNDS = [1, 2, 3, 3, 4, 4, 5]; // colours Yamuna shows in each of the seven rounds
const MAX_MISTAKES = 3; // three slips and Yama arrives
const TIME_LIMIT = 170; // seconds before Yama reaches the door of the room anyway
const STEP = 620; // ms between the colours Yamuna points to
const TAP_RADIUS = 70; // px; piles are ~77 px apart, so a fingertip rarely misses
const INPUT_DELAY = 380; // ms after the last colour flashes before you can start tapping (the flash itself lasts ~500)
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
const STRIPES = [0xc8302b, 0xf08a20, 0xf0c830, 0x6b8f3a, 0x25305f, 0x8a3070, 0xf0e8d8];

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
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);
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
    this.kLight = this.light.add({ x: this.flames.x, y: this.flames.y - 40, radius: 400, flicker: 0.05 });
    this.add.image(this.flames.x, this.flames.y - 30, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.4).setAlpha(0.45).setDepth(759);
    this.stripes = this.add.graphics().setDepth(210);

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
    for (let i = 0; i < 7; i++) this.input.keyboard.on(`keydown-${i + 1}`, () => this.tap(i));

    this.petals = this.add
      .particles(0, 0, 'petal', {
        lifespan: 2400, speedX: { min: -220, max: 220 }, speedY: { min: -360, max: -120 }, gravityY: 380,
        rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
      })
      .setDepth(830);

    this.buildHud();
    hudButtons(this, { pause: true });
    // how to play: the first round starts only once the player says "Got it"
    instructions(this, { kicker: 'DAY 5  ·  NIGHT 5', title: NIGHTS[5].name, sub: NIGHTS[5].goal }, () => this.startLevel());
  }

  startLevel() {
    this.hint = hintPill(this, 'Watch Yamuna point, then tap the same colours in the same order', H - 34);
    this.time.delayedCall(10000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
    this.time.delayedCall(700, () => this.newRound());
  }

  buildHud() {
    const g = this.add.graphics().setDepth(900);
    tornPaper(g, 18, 16, 7 * 34 + 36, 58, { seed: 23, amp: 2 });
    this.roundDots = STRIPES.map((c, i) =>
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
    tornPaper(bgPill, W / 2 - 250, 86, 500, 46, { seed: 31, amp: 1.6 });
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
    this.drawStripes(true);
    Sfx.chime();
    this.setStatus(this.round >= ROUNDS.length ? 'The tika is complete!' : 'Beautiful. Another colour…');
    this.tweens.add({ targets: this.yamuna, y: YAMUNA.y - 12, yoyo: true, duration: 240 });
    if (this.round >= ROUNDS.length) this.time.delayedCall(900, () => this.win());
    else this.time.delayedCall(1500, () => this.newRound());
  }

  mistake() {
    this.phase = 'between';
    this.mistakes++;
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

  drawStripes() {
    const g = this.stripes;
    g.clear();
    const k = this.keeper;
    const x0 = KEEPER.x + (FOREHEAD.fx - 0.5) * k.displayWidth;
    const y0 = KEEPER.y - k.displayHeight * (1 - FOREHEAD.fy);
    const sw = 7;
    const gap = 1.5;
    const total = this.round * (sw + gap) - gap;
    for (let i = 0; i < this.round; i++) {
      g.fillStyle(STRIPES[i], 1).fillRoundedRect(x0 - total / 2 + i * (sw + gap), y0 - 10, sw, 20, 2);
    }
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.phase !== 'won' && this.phase !== 'lost' && this.phase !== 'intro') {
      this.t += dt;
      this.updateThreat();
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
    plate.setScale(130 / plate.width);
    this.tweens.add({ targets: plate, alpha: 1, x: 1010, y: 520, duration: 1400, delay: 600, ease: 'Sine.easeInOut' });
    this.petals.explode(40, YAMUNA.x, 380);
    const t = titleText(this, W / 2, 190, 'Yama is pleased.', { size: 60, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 400 });
    this.time.delayedCall(4600, () => {
      completeNight(5, { mistakes: this.mistakes });
      go(this, 'StoryCard', {
        night: 5,
        card: { ...NIGHTS[5].card, bg: NIGHTS[5].bg },
        stats: [
          { label: 'Colours of tika', value: '7/7' },
          { label: 'Slips', value: String(this.mistakes) },
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
