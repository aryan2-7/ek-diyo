import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { DiyaRig } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, button, go, fadeIn, coverBg, globalKeys } from '../ui/ui.js';

/**
 * Shown before Night 1 (prologue) and after every night:
 * a paper story card drops in, and one more wick is lit on the diya.
 * data = { night, card:{art,title,body,fact,bg}, stats:[{label,value}], next, wicksBefore }
 */
export default class StoryCard extends Phaser.Scene {
  constructor() {
    super('StoryCard');
  }

  init(data) {
    this.d = data;
    this._leaving = false;
  }

  create() {
    const { card, stats, next, wicksBefore, night } = this.d;
    fadeIn(this, 700);
    globalKeys(this);

    coverBg(this, card.bg || 'title_bg', 0).setTint(0x3d3f5c);
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.28).setOrigin(0).setDepth(1);

    // the diya, gaining a wick
    this.add.image(230, 560, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(5).setAlpha(0.7).setDepth(2);
    this.rig = new DiyaRig(this, 230, 520, { width: 300, wicks: wicksBefore, depth: 10 });
    const lit = Math.min(wicksBefore + 1, 5);
    this.caption = text(
      this, 230, 640,
      night >= 5 ? 'All five wicks burn.' : `Wick ${lit} is lit.\nIt travels with you into Night ${lit}.`,
      { size: 26, color: CSS.turmeric, depth: 12, bold: true, spacing: 4 },
    ).setAlpha(0);

    // the card
    const c = this.add.container(W / 2 + 40, H / 2 + 4).setDepth(20);
    const frame = this.add.image(0, 0, 'card_frame');
    frame.setScale(664 / frame.height);
    const art = this.add.image(0, -232, card.art);
    art.setScale(Math.min(150 / art.height, 210 / art.width));
    const title = titleText(this, 0, -128, card.title, { size: 31, color: CSS.indigo, shadow: false, depth: 0, wrap: 380 });
    const body = text(this, 0, -86, card.body, { size: 21, color: CSS.soot, shadow: false, depth: 0, wrap: 372, spacing: 2, origin: [0.5, 0] });
    const fact = text(this, 0, 262, card.fact, { size: 18, color: CSS.vermilion, shadow: false, depth: 0, bold: true });
    // long titles shrink to one line
    for (let size = 31; size > 22 && title.height > 44; size--) title.setFontSize(size + 'px');
    // long stories shrink a little so they always fit the card
    for (let size = 21; size > 15 && body.height > 340; size--) body.setFontSize(size + 'px');
    c.add([frame, art, title, body, fact]);
    c.setPosition(W / 2 + 40, -420).setAngle(-9);
    this.tweens.add({
      targets: c, y: H / 2 + 4, angle: -1.2, duration: 900, delay: 500, ease: 'Back.easeOut',
      onStart: () => Sfx.paper(),
    });

    // right side: results
    let y = 190;
    stats.forEach((s) => {
      text(this, 1050, y, s.label, { size: 26, color: CSS.cream, depth: 20 }).setAlpha(0.9);
      titleText(this, 1050, y + 46, String(s.value), { size: 54, color: CSS.turmeric, depth: 20 });
      y += 130;
    });

    // light the wick once the card has landed
    this.time.delayedCall(1700, () => {
      if (lit <= 5 && night < 5) this.rig.addWick();
      this.tweens.add({ targets: this.caption, alpha: 1, duration: 600 });
    });

    const proceed = () => go(this, next);
    this.btn = button(this, 1050, 612, night === 0 ? 'Light the first night' : 'Continue', proceed, { w: 320, h: 64, size: 28 });
    this.btn.setAlpha(0);
    this.tweens.add({ targets: this.btn, alpha: 1, duration: 500, delay: 2300 });
    this.input.keyboard.on('keydown-SPACE', proceed);
    this.input.keyboard.on('keydown-ENTER', proceed);
  }

  update(time) {
    this.rig.update(time);
  }
}
