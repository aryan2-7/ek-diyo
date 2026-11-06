import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { DiyaRig } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { bestLine } from '../state.js';
import { text, titleText, button, go, fadeIn, coverBg, globalKeys, hudButtons } from '../ui/ui.js';

/** After Night 5: all five wicks burn. */
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
    coverBg(this, 'title_bg', 0).setTint(0x4a4d73);
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.25).setOrigin(0).setDepth(1);
    this.add.image(W / 2, 430, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(6).setAlpha(0.6).setDepth(2);
    this.rig = new DiyaRig(this, W / 2, 440, { width: 300, wicks: 5, depth: 10, texture: 'five_diya' });

    const t1 = titleText(this, W / 2, 130, 'Shubha Tihar', { size: 96, color: CSS.cream, depth: 20 }).setAlpha(0);
    const t2 = text(this, W / 2, 210, 'शुभ तिहार  ·  five days, five lights', { size: 34, color: CSS.turmeric, depth: 20, bold: true }).setAlpha(0);
    const t3 = text(this, W / 2, 640, 'The crow, the dog, the cow, the hill of offerings, the sister and the brother:\nall of them guarded, all of them thanked.', { size: 26, color: CSS.cream, depth: 20, spacing: 6 }).setAlpha(0);
    [t1, t2, t3].forEach((t, i) => this.tweens.add({ targets: t, alpha: 1, duration: 1200, delay: 600 + i * 700 }));
    // a recap built from the save: the five nights, in the player's own numbers
    const recap = [1, 2, 3, 4, 5].map((n) => bestLine(n)).filter(Boolean);
    if (recap.length) {
      text(this, W / 2, 570, recap.join('  ·  '), { size: 22, color: CSS.turmeric, depth: 20 }).setAlpha(0.9);
    }
    this.time.delayedCall(900, () => Sfx.fanfare());

    const b = button(this, W - 190, H - 52, 'Play again', () => go(this, 'Title'), { w: 280, h: 60, size: 26 });
    b.setAlpha(0);
    b.input.enabled = false;
    this.tweens.add({ targets: b, alpha: 1, duration: 600, delay: 1800, onComplete: () => (b.input.enabled = true) });
    let ready = false;
    this.time.delayedCall(1800, () => (ready = true));
    const again = () => ready && go(this, 'Title');
    this.input.keyboard.on('keydown-SPACE', again);
    this.input.keyboard.on('keydown-ENTER', again);
  }

  update(time) {
    this.rig.update(time);
  }
}
