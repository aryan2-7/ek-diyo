import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { CREDITS } from '../data/credits.js';
import { text, titleText, button, tornPaper } from '../ui/ui.js';

/** Credits overlay. data = { from: 'Settings' | 'Ending' } */
export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.75).setOrigin(0).setDepth(0);
    const pw = 800;
    const ph = 700;
    const g = this.add.graphics().setDepth(1);
    tornPaper(g, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { seed: 61 });
    titleText(this, W / 2, H / 2 - 308, 'Credits', { size: 44, color: CSS.indigo, shadow: false, depth: 2 });
    let y = H / 2 - 262;
    CREDITS.slice(1).forEach((c) => {
      text(this, W / 2, y, c.h, { size: 19, color: CSS.vermilion, bold: true, shadow: false, depth: 2 });
      const t = text(this, W / 2, y + 11, c.t, { size: 21, color: CSS.soot, shadow: false, depth: 2, wrap: 720, origin: [0.5, 0], spacing: 2 });
      y += 22 + t.height + 8;
    });
    button(this, W / 2, H / 2 + 318, 'Close', () => this.close(), { w: 220, h: 54, size: 26, depth: 3 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-ENTER', () => this.close());
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
