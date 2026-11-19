import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { DiyaRig } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { settings } from '../systems/settings.js';
import { Quality } from '../systems/quality.js';
import { fireflies, windowGlows } from '../systems/ambience.js';
import { bestLine } from '../state.js';
import { openGreeting } from '../ui/greeting.js';
import { text, titleText, button, focusMenu, go, fadeIn, coverBg, globalKeys, hudButtons } from '../ui/ui.js';

const FIRST = 900; // ms until the first wick is lit
const GAP = 650; // ms between wicks

/** After Night 5: the five wicks are lit one by one, and the town lights up with them. */
export default class Ending extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  init() {
    this._leaving = false;
  }

  create() {
    fadeIn(this, 1200);
    globalKeys(this);
    hudButtons(this, { x: W - 44 });
    Sfx.setLevel(5);
    coverBg(this, 'title_bg', 0, { breathe: true }).setTint(0x4a4d73);
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.25).setOrigin(0).setDepth(1);
    this.halo = this.add.image(W / 2, 395, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(6).setAlpha(0.1).setDepth(2);
    this.rig = new DiyaRig(this, W / 2, 395, { width: 280, wicks: 0, depth: 10, texture: 'five_diya' });
    fireflies(this, { count: 16, area: [120, 250, 1040, 330], depth: 4 });
    windowGlows(this, [[70, 431, 11, 14], [387, 421, 9, 15], [414, 421, 9, 15], [1219, 419, 10, 16]], { depth: 3 });

    // the five wicks, one by one: each lights with a note, and the glow grows
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(FIRST + i * GAP, () => {
        this.rig.addWick();
        Sfx.footprint(i);
        this.tweens.add({ targets: this.halo, alpha: 0.1 + (i + 1) * 0.1, duration: 500 });
      });
    }
    const lit = FIRST + 5 * GAP;
    this.time.delayedCall(lit, () => {
      Sfx.fanfare();
      if (!settings.reduceMotion) this.petals.start();
    });
    this.petals = this.add
      .particles(0, 0, 'petal', {
        x: { min: -60, max: W }, y: -24, lifespan: 10000, speedX: { min: 8, max: 46 }, speedY: { min: 30, max: 70 },
        rotate: { start: 0, end: 360 }, scale: { min: 0.6, max: 1.1 }, tint: [0xf2a33a, 0xc8432b, 0xe8c44b],
        frequency: Quality.pick(260, 520), emitting: false,
      })
      .setDepth(6);

    const t1 = titleText(this, W / 2, 104, 'Shubha Tihar', { size: 92, color: CSS.cream, depth: 20 }).setAlpha(0);
    const t2 = text(this, W / 2, 178, 'शुभ तिहार  ·  five days, five lights', { size: 32, color: CSS.turmeric, depth: 20, bold: true }).setAlpha(0);
    const t3 = text(this, W / 2, 656, 'The crow, the dog, the cow, the hill of offerings, the sister and the brother:\nall of them guarded, all of them thanked.', { size: 25, color: CSS.cream, depth: 20, spacing: 6, wrap: 900 }).setAlpha(0);
    [t1, t2, t3].forEach((t, i) => this.tweens.add({ targets: t, alpha: 1, duration: 1200, delay: lit + 200 + i * 600 }));
    // a recap built from the save: the five nights, in the player's own numbers
    const recap = [1, 2, 3, 4, 5].map((n) => bestLine(n)).filter(Boolean);
    if (recap.length) this.tweens.add({ targets: text(this, W / 2, 596, recap.join('  ·  '), { size: 20, color: CSS.turmeric, depth: 20, wrap: 1000 }).setAlpha(0), alpha: 0.9, duration: 1200, delay: lit + 1400 });

    // buttons (they fade in; invisible buttons must not be clickable). Arrow keys move the highlight, Enter presses it.
    const at = lit + 2000;
    const make = (y, label, fn) => {
      const b = button(this, 1110, y, label, fn, { w: 250, h: 54, size: 24 });
      b.setAlpha(0).setVisible(false);
      b.input.enabled = false;
      this.tweens.add({ targets: b, alpha: 1, duration: 600, delay: at, onStart: () => b.setVisible(true), onComplete: () => (b.input.enabled = true) });
      return b;
    };
    const btns = [
      make(380, 'Your five nights', () => this.open('Album')),
      make(452, 'Greeting card', () => openGreeting(this)),
      make(524, 'Play again', () => go(this, 'Title')),
    ];
    const credits = button(this, 1110, 590, 'credits', () => this.open('Credits'), { w: 220, h: 46, size: 22, depth: 20 });
    credits.setAlpha(0).setVisible(false);
    credits.input.enabled = false;
    this.tweens.add({ targets: credits, alpha: 0.8, duration: 600, delay: at, onStart: () => credits.setVisible(true), onComplete: () => (credits.input.enabled = true) });
    focusMenu(this, btns, { start: 2, readyAt: at + 600 });
  }

  open(key) {
    this.scene.pause();
    this.scene.launch(key, { from: 'Ending' });
  }

  update(time) {
    this.rig.update(time);
  }
}
