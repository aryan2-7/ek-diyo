import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { CREDITS } from '../data/credits.js';
import { text, titleText, button, tornPaper } from '../ui/ui.js';

const CARD_W = 760;
const TEXT_W = 640;
const HEAD = 18; // heading size
const BODY = 21; // text size

/** Credits overlay. data = { from: 'Settings' | 'Ending' } */
export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.78).setOrigin(0).setDepth(0);

    // measure first, so the card fits its content with an even margin all round (it used to run nearly edge to edge)
    const [intro, ...entries] = CREDITS;
    const blocks = entries.map((c) => ({
      head: text(this, W / 2, 0, c.h, { size: HEAD, color: CSS.vermilion, bold: true, shadow: false, depth: 2, origin: [0.5, 0] }),
      body: text(this, W / 2, 0, c.t, { size: BODY, color: CSS.soot, shadow: false, depth: 2, wrap: TEXT_W, origin: [0.5, 0], spacing: 2 }),
    }));
    const BETWEEN = 12;
    const listH = blocks.reduce((n, b) => n + b.head.height + 2 + b.body.height, 0) + BETWEEN * (blocks.length - 1);
    const TOP = 116; // title, tagline and the row of five lights
    const BOTTOM = 106; // the Close button and its margin
    const ph = Math.min(H - 20, TOP + listH + BOTTOM);
    const x0 = W / 2 - CARD_W / 2;
    const y0 = (H - ph) / 2;

    const g = this.add.graphics().setDepth(1);
    tornPaper(g, x0, y0, CARD_W, ph, { seed: 61 });
    g.lineStyle(2.5, COLORS.indigo, 0.5);
    g.strokeRoundedRect(x0 + 14, y0 + 14, CARD_W - 28, ph - 28, 10);

    const title = titleText(this, W / 2, y0 + 52, intro.h, { size: 46, color: CSS.indigo, shadow: false, depth: 2 });
    const tag = text(this, W / 2, y0 + 90, intro.t, { size: 21, color: CSS.vermilion, bold: true, shadow: false, depth: 2 });
    // five little lights: the whole game in one divider (the middle one is brightest)
    const lights = this.add.graphics().setDepth(2);
    lights.lineStyle(2, COLORS.indigo, 0.3);
    lights.lineBetween(x0 + 70, y0 + 112, x0 + CARD_W / 2 - 74, y0 + 112);
    lights.lineBetween(x0 + CARD_W / 2 + 74, y0 + 112, x0 + CARD_W - 70, y0 + 112);
    for (let i = 0; i < 5; i++) {
      const lx = W / 2 + (i - 2) * 28;
      lights.fillStyle(COLORS.soot, 0.25).fillCircle(lx + 1, y0 + 114, i === 2 ? 7 : 5.5);
      lights.fillStyle(i === 2 ? COLORS.vermilion : COLORS.marigold, 1).fillCircle(lx, y0 + 112, i === 2 ? 7 : 5.5);
    }

    let y = y0 + TOP + 14;
    blocks.forEach((b) => {
      b.head.setY(y);
      b.body.setY(y + b.head.height + 2);
      y += b.head.height + 2 + b.body.height + BETWEEN;
    });

    const close = button(this, W / 2, y0 + ph - 54, 'Close', () => this.close(), { w: 200, h: 50, size: 24, depth: 3 });

    // the card settles in rather than snapping on
    const all = [g, title, tag, lights, ...blocks.flatMap((b) => [b.head, b.body]), close];
    all.forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: all, alpha: 1, duration: 260, ease: 'Sine.easeOut' });

    ['ESC', 'ENTER', 'SPACE'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.close()));
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
