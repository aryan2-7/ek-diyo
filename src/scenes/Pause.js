import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { Sfx } from '../systems/sfx.js';
import { titleText, button, tornPaper } from '../ui/ui.js';

/**
 * Pause menu. Launched on top of a night (which is paused underneath).
 * data = { from: 'Night3' }
 */
export default class Pause extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.62).setOrigin(0).setDepth(0);
    const pw = 460;
    const ph = 430;
    const g = this.add.graphics().setDepth(1);
    tornPaper(g, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { seed: 41 });
    titleText(this, W / 2, H / 2 - 160, 'Paused', { size: 52, color: CSS.indigo, shadow: false, depth: 2 });

    const resume = () => {
      this.scene.stop();
      this.scene.resume(this.from);
    };
    button(this, W / 2, H / 2 - 80, 'Resume', resume, { w: 320, h: 58, size: 28, depth: 3 });
    button(this, W / 2, H / 2 - 4, 'Restart night', () => {
      this.scene.stop();
      this.scene.start(this.from);
    }, { w: 320, h: 58, size: 28, depth: 3 });
    const snd = button(this, W / 2, H / 2 + 72, '', () => {
      Sfx.toggleMute();
      label.setText(Sfx.muted ? 'Sound: off' : 'Sound: on');
    }, { w: 320, h: 58, size: 28, depth: 3 });
    const label = snd.list[1];
    label.setText(Sfx.muted ? 'Sound: off' : 'Sound: on');
    button(this, W / 2, H / 2 + 148, 'Quit to title', () => {
      this.scene.stop(this.from);
      this.scene.start('Title');
    }, { w: 320, h: 58, size: 28, depth: 3 });

    this.input.keyboard.on('keydown-ESC', resume);
    this.input.keyboard.on('keydown-P', resume);
    this.input.keyboard.on('keydown-M', () => label.setText(Sfx.toggleMute() ? 'Sound: off' : 'Sound: on'));
  }
}
