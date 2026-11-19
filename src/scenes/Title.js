import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS, PROLOGUE, IMPLEMENTED } from '../data/nights.js';
import { state, bestLine, rating } from '../state.js';
import { settings } from '../systems/settings.js';
import { Flame } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { windowGlows, birds, fireflies, parallax } from '../systems/ambience.js';
import { text, titleText, button, labelPill, go, fadeIn, coverBg, globalKeys, paperGrain, hudButtons } from '../ui/ui.js';

let entered = false; // the "tap to begin" screen shows once per page load

export default class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  init() {
    this._leaving = false;
    this.gateUp = false;
    this.lockUntil = 0;
  }

  create() {
    fadeIn(this, 1000);
    Sfx.setLevel(1);
    this.bg = coverBg(this, 'title_bg', 0, { breathe: true });
    globalKeys(this);
    hudButtons(this, { x: W - 44, settings: true, fullscreen: true });

    // twinkling stars in the sky
    for (let i = 0; i < 22; i++) {
      const s = this.add.image(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(8, 210), 'star').setDepth(2);
      s.setScale(Phaser.Math.FloatBetween(0.1, 0.26)).setAlpha(0);
      this.tweens.add({
        targets: s, alpha: { from: 0.05, to: 0.9 }, duration: Phaser.Math.Between(900, 2200),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000), ease: 'Sine.easeInOut',
      });
    }
    // the town is alive: flickering windows, a few birds, fireflies in the dusk
    windowGlows(this, [[70, 431, 11, 14], [387, 421, 9, 15], [414, 421, 9, 15], [1219, 419, 10, 16]], { depth: 3 });
    birds(this, { y: [40, 190] });
    fireflies(this, { count: 10, area: [100, 380, 1080, 260] });

    // the Keeper with his diya
    this.keeper = this.add.image(W / 2, 706, 'keeper').setOrigin(0.5, 1).setDepth(10);
    this.keeper.setScale(310 / this.keeper.height);
    this.flame = new Flame(this, 0, 0, { size: 46, depth: 20 });
    const emb = this.add.particles(0, 0, 'ember', {
      lifespan: { min: 800, max: 1500 }, speedY: { min: -50, max: -100 }, speedX: { min: -18, max: 18 },
      scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 160,
    });
    emb.setDepth(21).startFollow(this.flame, 0, -30);
    parallax(this, [{ obj: this.bg, amt: 12 }, { obj: this.keeper, amt: -7 }]);

    // title (raised a little so it clears the stupa spire and the pagoda finial). The small line sits on paper so it is easy to read.
    const t1 = titleText(this, W / 2, 118, 'The Five Nights', { size: 94, color: CSS.cream, depth: 30 });
    const t2 = text(this, W / 2, 214, 'one diya, five days', { size: 38, color: CSS.turmeric, depth: 30, bold: true });
    const t3 = labelPill(this, W / 2, 268, 'तिहार  ·  a Tihar story', { size: 26, depth: 30 }).container;
    [t1, t2, t3].forEach((t, i) => {
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 500 + i * 350 });
      t.y += 14;
      this.tweens.add({ targets: t, y: t.y - 14, duration: 900, delay: 500 + i * 350, ease: 'Sine.easeOut' });
    });

    // play button (Enter or Space also begins)
    const begin = () => {
      if (this._leaving || this.gateUp || this.time.now < this.lockUntil) return;
      Sfx.startAmbient();
      go(this, 'StoryCard', { night: 0, card: PROLOGUE, stats: [], next: 'Night1', wicksBefore: 0 });
    };
    this.play = button(this, 1020, 630, state.unlocked > 1 ? 'Begin again' : 'Begin', begin, { w: 300, h: 68, size: 34 });
    this.input.keyboard.on('keydown-ENTER', begin);
    this.input.keyboard.on('keydown-SPACE', begin);

    // night select: flames show how well each night went (visible on touch too); hover a finished night for the details
    this.best = text(this, 36, 704, '', { size: 20, color: CSS.turmeric, origin: [0, 0.5], depth: 30 });
    labelPill(this, 50, 556, 'Nights', { size: 22, anchor: [0, 0.5], depth: 30 });
    this.buildNights();
    // when Settings closes, the nights are drawn again (so "Open every night" takes effect at once)
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      if (this.unlockSeen !== settings.unlockAll) this.buildNights();
    });

    // keyboard hints only where there is a keyboard
    this.hint = this.sys.game.device.os.desktop
      ? labelPill(this, W - 16, H - 12, 'Enter: begin  ·  F: full screen  ·  M: sound', {
        size: 20, anchor: [1, 1], depth: 30, bold: false, fit: ['F or Esc: leave full screen  ·  M: sound'],
      })
      : null;
    this.hintShown = '';
    paperGrain(this, 0.1);

    if (!entered) entered = true;
  }

  /** The first screen: one tap unlocks sound and full screen (browsers do not allow either without it), and the music starts at once. */
  openGate() {
    this.gateUp = true;
    const veil = this.add.rectangle(0, 0, W, H, COLORS.soot, 0.55).setOrigin(0).setDepth(2000).setInteractive();
    const pill = labelPill(this, W / 2, 352, 'Tap or press any key to begin', { size: 38, depth: 2001 }).container;
    const sub = text(this, W / 2, 424, 'sound on  ·  full screen  ·  best with headphones', { size: 26, color: CSS.cream, depth: 2001 });
    this.tweens.add({ targets: pill, scale: 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    const done = () => {
      if (!this.gateUp) return;
      this.gateUp = false;
      entered = true;
      this.lockUntil = this.time.now + 450; // the key that opened the gate must not also press Begin
      this.input.keyboard.off('keydown', done);
      Sfx.unlock();
      Sfx.startAmbient();
      this.tweens.add({
        targets: [veil, pill, sub], alpha: 0, duration: 450,
        onComplete: () => [veil, pill, sub].forEach((o) => o.destroy()),
      });
    };
    veil.on('pointerup', done);
    this.input.keyboard.on('keydown', done);
  }

  buildNights() {
    this.nightObjs?.forEach((o) => o.destroy());
    this.nightObjs = [];
    this.unlockSeen = settings.unlockAll;
    const keep = (o) => {
      this.nightObjs.push(o);
      return o;
    };
    for (let n = 1; n <= 5; n++) {
      const x = 80 + (n - 1) * 78;
      const open = n <= IMPLEMENTED && (settings.unlockAll || n <= state.unlocked);
      const d = keep(this.add.image(x, 632, 'diya').setDepth(30));
      d.setScale(56 / d.width).setAlpha(open ? 1 : 0.3);
      keep(text(this, x, 668, String(n), { size: 22, color: open ? CSS.turmeric : CSS.cream, depth: 30, bold: true }).setAlpha(open ? 1 : 0.45));
      const r = rating(n);
      if (r) for (let k = 0; k < 3; k++) keep(this.add.image(x + (k - 1) * 17, 598, 'star').setScale(0.36).setDepth(30).setAlpha(k < r ? 1 : 0.22));
      if (open) {
        d.setInteractive({ useHandCursor: true });
        d.on('pointerover', () => {
          this.tweens.add({ targets: d, scale: (56 / d.width) * 1.15, duration: 100 });
          this.best.setText(bestLine(n) ? `Night ${n} best: ${bestLine(n)}` : '');
        });
        d.on('pointerout', () => {
          this.tweens.add({ targets: d, scale: 56 / d.width, duration: 100 });
          this.best.setText('');
        });
        d.on('pointerup', () => {
          if (this.gateUp) return;
          Sfx.click();
          Sfx.startAmbient();
          go(this, NIGHTS[n].scene);
        });
      }
    }
  }

  update(time) {
    const k = this.keeper;
    const bob = Math.sin(time * 0.002) * 0.008;
    k.setScale((310 / k.height) * (1 - bob), (310 / k.height) * (1 + bob));
    this.flame.setPosition(k.x + (0.47 - 0.5) * k.displayWidth, k.y - k.displayHeight * (1 - 0.405));
    this.flame.update(time);
    const want = this.scale.isFullscreen ? 'F or Esc: leave full screen  ·  M: sound' : 'Enter: begin  ·  F: full screen  ·  M: sound';
    if (this.hint && want !== this.hintShown) {
      this.hintShown = want;
      this.hint.label.setText(want);
    }
  }
}
