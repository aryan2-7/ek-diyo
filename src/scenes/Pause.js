import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, button, focusMenu, tornPaper } from '../ui/ui.js';

// a reminder of the controls of the night that is paused
const CONTROLS = {
  Night1: 'Move: drag, arrow keys or WASD. Stand beside a plate to light it, and beside a lit one to shield it from gusts.',
  Night2: 'Jump: Space, W, the up arrow or a tap. Hold for a higher leap.',
  Night3: 'Move: drag, arrow keys or WASD. Stand beside a lamp to refill and shield it. Carry the garland to the cow.',
  Night4: 'Drop the offering: click, tap or press Space. Land it near the centre of the hill.',
  Night5: 'Drag the garland and the plate (or press Space). Tap a colour or press 1 to 7. Swipe down his forehead (or hold Space).',
};

/**
 * Pause menu. Launched on top of a night (which is paused underneath); the sound is muffled while it is open.
 * Arrow keys / W S move the highlight, Enter or Space presses. data = { from: 'Night3' }
 */
export default class Pause extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    Sfx.muffle(true);
    this.events.once('shutdown', () => Sfx.muffle(false));
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.62).setOrigin(0).setDepth(0);
    const pw = 480;
    const ph = 650;
    const g = this.add.graphics().setDepth(1);
    tornPaper(g, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { seed: 41 });
    titleText(this, W / 2, H / 2 - 268, 'Paused', { size: 52, color: CSS.indigo, shadow: false, depth: 2 });
    if (CONTROLS[this.from]) text(this, W / 2, H / 2 - 222, CONTROLS[this.from], { size: 20, color: CSS.soot, shadow: false, depth: 2, wrap: 410, origin: [0.5, 0], spacing: 2 });

    const resume = () => {
      this.scene.stop();
      this.scene.resume(this.from);
    };
    const openSettings = () => {
      this.scene.pause();
      this.scene.launch('Settings', { from: 'Pause' });
    };
    const opts = { w: 320, h: 58, size: 28, depth: 3 };
    const btns = [
      button(this, W / 2, H / 2 - 90, 'Resume', resume, opts),
      button(this, W / 2, H / 2 - 14, 'Restart night', () => {
        this.scene.stop();
        this.scene.start(this.from);
      }, opts),
      button(this, W / 2, H / 2 + 62, 'Settings', openSettings, opts),
      button(this, W / 2, H / 2 + 138, '', () => {
        Sfx.toggleMute();
        label.setText(Sfx.muted ? 'Sound: off' : 'Sound: on');
      }, opts),
      button(this, W / 2, H / 2 + 214, 'Quit to title', () => {
        this.scene.stop(this.from);
        this.scene.start('Title');
      }, opts),
    ];
    const label = btns[3].list[1];
    label.setText(Sfx.muted ? 'Sound: off' : 'Sound: on');
    focusMenu(this, btns, { start: 0 });

    this.input.keyboard.on('keydown-ESC', resume); // Esc toggles the pause menu
    this.input.keyboard.on('keydown-P', openSettings); // P opens Settings everywhere
    this.input.keyboard.on('keydown-M', () => label.setText(Sfx.toggleMute() ? 'Sound: off' : 'Sound: on'));
  }
}
