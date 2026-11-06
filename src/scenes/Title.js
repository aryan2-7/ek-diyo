import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS, PROLOGUE, IMPLEMENTED } from '../data/nights.js';
import { state, bestLine } from '../state.js';
import { Flame } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, button, go, fadeIn, coverBg, globalKeys, paperGrain, hudButtons } from '../ui/ui.js';

export default class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  init() {
    this._leaving = false;
  }

  create() {
    fadeIn(this, 1000);
    coverBg(this, 'title_bg', 0);
    globalKeys(this);
    hudButtons(this, { x: W - 44 });

    // twinkling stars in the sky
    for (let i = 0; i < 22; i++) {
      const s = this.add.image(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(8, 210), 'star').setDepth(2);
      s.setScale(Phaser.Math.FloatBetween(0.1, 0.26)).setAlpha(0);
      this.tweens.add({
        targets: s, alpha: { from: 0.05, to: 0.9 }, duration: Phaser.Math.Between(900, 2200),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000), ease: 'Sine.easeInOut',
      });
    }

    // the Keeper with his diya
    this.keeper = this.add.image(W / 2, 706, 'keeper').setOrigin(0.5, 1).setDepth(10);
    this.keeper.setScale(310 / this.keeper.height);
    this.flame = new Flame(this, 0, 0, { size: 46, depth: 20 });
    const emb = this.add.particles(0, 0, 'ember', {
      lifespan: { min: 800, max: 1500 }, speedY: { min: -50, max: -100 }, speedX: { min: -18, max: 18 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 160,
    });
    emb.setDepth(21).startFollow(this.flame, 0, -30);

    // title
    const t1 = titleText(this, W / 2, 178, 'The Five Nights', { size: 100, color: CSS.cream, depth: 30 });
    const t2 = text(this, W / 2, 262, 'one diya, five days', { size: 40, color: CSS.turmeric, depth: 30, bold: true });
    const t3 = text(this, W / 2, 308, 'तिहार  ·  a Tihar story', { size: 24, color: CSS.cream, depth: 30 }).setAlpha(0.9);
    [t1, t2, t3].forEach((t, i) => {
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: i === 2 ? 0.9 : 1, y: t.y, duration: 900, delay: 500 + i * 350 });
      t.y += 14;
      this.tweens.add({ targets: t, y: t.y - 14, duration: 900, delay: 500 + i * 350, ease: 'Sine.easeOut' });
    });

    // play button
    this.play = button(this, 1020, 630, state.unlocked > 1 ? 'Begin again' : 'Begin', () => {
      Sfx.startAmbient();
      go(this, 'StoryCard', { night: 0, card: PROLOGUE, stats: [], next: 'Night1', wicksBefore: 0 });
    }, { w: 300, h: 68, size: 34 });

    // sound is on by default, but let the title settle for a beat before the ambience begins
    this.time.delayedCall(2400, () => Sfx.startAmbient());

    // night select (hover a finished night to see your best)
    const best = text(this, 36, 704, '', { size: 20, color: CSS.turmeric, origin: [0, 0.5], depth: 30 });
    text(this, 190, 586, 'Nights', { size: 22, color: CSS.cream, depth: 30 }).setAlpha(0.85);
    for (let n = 1; n <= 5; n++) {
      const x = 80 + (n - 1) * 78;
      const open = n <= IMPLEMENTED && n <= state.unlocked;
      const d = this.add.image(x, 632, 'diya').setDepth(30);
      d.setScale(56 / d.width).setAlpha(open ? 1 : 0.3);
      const num = text(this, x, 668, String(n), { size: 22, color: open ? CSS.turmeric : CSS.cream, depth: 30, bold: true }).setAlpha(open ? 1 : 0.45);
      if (bestLine(n)) this.add.circle(x, 598, 5, COLORS.turmeric, 1).setDepth(30); // finished
      if (open) {
        d.setInteractive({ useHandCursor: true });
        d.on('pointerover', () => {
          this.tweens.add({ targets: d, scale: (56 / d.width) * 1.15, duration: 100 });
          best.setText(bestLine(n) ? `Night ${n} best: ${bestLine(n)}` : '');
        });
        d.on('pointerout', () => {
          this.tweens.add({ targets: d, scale: 56 / d.width, duration: 100 });
          best.setText('');
        });
        d.on('pointerup', () => {
          Sfx.click();
          Sfx.startAmbient();
          go(this, NIGHTS[n].scene);
        });
      }
    }

    text(this, W - 18, H - 12, 'M sound · F fullscreen', { size: 18, color: CSS.cream, origin: [1, 1], depth: 30 }).setAlpha(0.65);
    paperGrain(this, 0.1);
  }

  update(time) {
    const k = this.keeper;
    const bob = Math.sin(time * 0.002) * 0.008;
    k.setScale((310 / k.height) * (1 - bob), (310 / k.height) * (1 + bob));
    this.flame.setPosition(k.x + (0.47 - 0.5) * k.displayWidth, k.y - k.displayHeight * (1 - 0.405));
    this.flame.update(time);
  }
}
