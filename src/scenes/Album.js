import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { Album } from '../systems/album.js';
import { text, titleText, button } from '../ui/ui.js';
import { openGreeting } from '../ui/greeting.js';

/** "Your five nights": the pictures taken at each win, hung on a string. data = { from } */
export default class AlbumScene extends Phaser.Scene {
  constructor() {
    super('Album');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.82).setOrigin(0).setDepth(0);
    titleText(this, W / 2, 78, 'Your five nights', { size: 56, color: CSS.cream, depth: 2 });

    // the string
    const s = this.add.graphics().setDepth(1);
    s.lineStyle(4, 0x8a6a3a, 1);
    s.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = 40 + ((W - 80) * i) / 40;
      const y = 168 + Math.sin((i / 40) * Math.PI) * 26;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    s.strokePath();

    for (let n = 1; n <= 5; n++) {
      const x = 150 + (n - 1) * 245;
      const sag = Math.sin(((x - 40) / (W - 80)) * Math.PI) * 26;
      const c = this.add.container(x, 168 + sag + 120).setDepth(3).setAngle(Phaser.Math.FloatBetween(-3.5, 3.5));
      const g = this.add.graphics();
      g.fillStyle(COLORS.soot, 0.4).fillRect(-103, -88, 214, 214);
      g.fillStyle(COLORS.cream, 1).fillRect(-107, -92, 214, 214);
      g.fillStyle(0xb98a4a, 1).fillRoundedRect(-9, -112, 18, 38, 4); // the peg
      c.add(g);
      const key = Album.shots[n];
      if (key && this.textures.exists(key)) {
        const img = this.add.image(0, -36, key);
        img.setScale(190 / img.width);
        c.add(img);
      } else {
        const blank = this.add.rectangle(0, -36, 190, 103, COLORS.indigo, 0.55);
        c.add([blank, text(this, 0, -36, 'not lit yet', { size: 20, color: CSS.cream, shadow: false, depth: 0 })]);
      }
      c.add(text(this, 0, 54, NIGHTS[n].name, { size: 22, color: CSS.indigo, bold: true, shadow: false, depth: 0 }));
      c.add(text(this, 0, 82, NIGHTS[n].day, { size: 18, color: CSS.vermilion, shadow: false, depth: 0 }));
    }

    text(this, W / 2, 520, 'A picture is taken the moment you win each night.', { size: 22, color: CSS.cream, depth: 2 }).setAlpha(0.8);
    button(this, W / 2 - 190, 610, 'Make a greeting card', () => openGreeting(this), { w: 340, h: 62, size: 28, depth: 4 });
    button(this, W / 2 + 190, 610, 'Back', () => this.close(), { w: 220, h: 62, size: 28, depth: 4 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
