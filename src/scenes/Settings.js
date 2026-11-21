import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { settings, saveSettings } from '../systems/settings.js';
import { Quality } from '../systems/quality.js';
import { Sfx } from '../systems/sfx.js';
import { resetProgress } from '../state.js';
import { text, titleText, button, tornPaper } from '../ui/ui.js';

/** Settings overlay (opened from the title and the pause menu). data = { from: 'Title' | 'Pause' } */
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.7).setOrigin(0).setDepth(0);
    const pw = 740;
    const ph = 640;
    const g = this.add.graphics().setDepth(1);
    tornPaper(g, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { seed: 53 });
    titleText(this, W / 2, H / 2 - 268, 'Settings', { size: 50, color: CSS.indigo, shadow: false, depth: 2 });

    const left = W / 2 - 310;
    const ctl = W / 2 - 40;
    let y = H / 2 - 196;
    const label = (str) => text(this, left, y, str, { size: 28, color: CSS.indigo, shadow: false, depth: 2, origin: [0, 0.5] });

    label('Music');
    this.slider(ctl, y, 330, settings.music, (v) => {
      settings.music = v;
      Sfx.setVolumes();
    });
    y += 66;
    label('Sound effects');
    this.slider(ctl, y, 330, settings.sfx, (v) => {
      settings.sfx = v;
      Sfx.setVolumes();
    }, () => Sfx.collect());
    y += 66;
    label('Picture quality');
    this.segmented(ctl, y, ['Auto', 'High', 'Low'], ['auto', 'high', 'low'].indexOf(settings.quality), (i) => {
      settings.quality = ['auto', 'high', 'low'][i];
      Quality.init();
    });
    y += 66;
    label('Full screen at start');
    this.toggle(ctl, y, settings.fullscreen, (v) => (settings.fullscreen = v));
    text(this, ctl + 140, y, 'reload for changes to take effect', { size: 16, color: CSS.vermilion, bold: true, shadow: false, depth: 2, origin: [0, 0.5], wrap: 250 });
    y += 66;
    label('Reduce motion');
    this.toggle(ctl, y, settings.reduceMotion, (v) => (settings.reduceMotion = v));
    text(this, ctl + 140, y, 'reload for changes to take effect', { size: 16, color: CSS.vermilion, bold: true, shadow: false, depth: 2, origin: [0, 0.5], wrap: 250 });
    y += 66;
    text(this, left, y, 'Unlock levels and playthrough', { size: 22, color: CSS.indigo, shadow: false, depth: 2, origin: [0, 0.5], wrap: 250 });
    this.toggle(ctl, y, settings.unlockAll, (v) => (settings.unlockAll = v));
    text(this, ctl + 140, y, 'reload for changes to take effect', { size: 16, color: CSS.vermilion, bold: true, shadow: false, depth: 2, origin: [0, 0.5], wrap: 250 });
    y += 66;

    if (this.from === 'Title') {
      let armed = false;
      const reset = text(this, W / 2, H / 2 + 200, 'Reset saved progress', { size: 22, color: CSS.vermilion, shadow: false, depth: 3 }).setInteractive({ useHandCursor: true });
      reset.on('pointerup', () => {
        Sfx.click();
        if (!armed) {
          armed = true;
          reset.setText('Tap again to erase your nights and flames');
          this.time.delayedCall(3500, () => {
            armed = false;
            reset.setText('Reset saved progress');
          });
          return;
        }
        resetProgress();
        saveSettings();
        this.scene.stop();
        this.scene.stop('Title');
        this.scene.start('Title');
      });
    }

    button(this, W / 2 - 150, H / 2 + 262, 'Credits', () => this.openCredits(), { w: 240, h: 56, size: 26, depth: 3 });
    button(this, W / 2 + 150, H / 2 + 262, 'Done', () => this.close(), { w: 240, h: 56, size: 26, depth: 3 });
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  openCredits() {
    this.scene.pause();
    this.scene.launch('Credits', { from: 'Settings' });
  }

  close() {
    saveSettings();
    this.scene.stop();
    this.scene.resume(this.from);
  }

  slider(x, y, w, value, onChange, onRelease) {
    const g = this.add.graphics().setDepth(3);
    let v = value;
    const draw = () => {
      g.clear();
      g.fillStyle(COLORS.indigo, 0.25).fillRoundedRect(x, y - 5, w, 10, 5);
      g.fillStyle(COLORS.marigold, 1).fillRoundedRect(x, y - 5, Math.max(10, w * v), 10, 5);
      g.fillStyle(COLORS.soot, 1).fillCircle(x + w * v, y, 16);
      g.fillStyle(COLORS.turmeric, 1).fillCircle(x + w * v, y, 12);
    };
    const set = (p) => {
      v = Phaser.Math.Clamp((p.worldX - x) / w, 0, 1);
      draw();
      onChange(v);
    };
    const hit = this.add.rectangle(x + w / 2, y, w + 50, 60, 0x000000, 0.001).setDepth(4).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', set);
    hit.on('pointermove', (p) => p.isDown && set(p));
    hit.on('pointerup', () => onRelease?.(v));
    draw();
  }

  toggle(x, y, on, onChange) {
    const c = this.add.container(x + 45, y).setDepth(3);
    const g = this.add.graphics();
    const t = text(this, 0, 0, '', { size: 20, bold: true, shadow: false, depth: 0 });
    c.add([g, t]);
    c.setSize(100, 52);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 52), Phaser.Geom.Rectangle.Contains);
    if (c.input) c.input.cursor = 'pointer';
    const draw = () => {
      g.clear();
      g.fillStyle(on ? COLORS.leaf : COLORS.indigo, on ? 1 : 0.3).fillRoundedRect(-45, -20, 90, 40, 20);
      g.fillStyle(COLORS.cream, 1).fillCircle(on ? 25 : -25, 0, 15);
      g.lineStyle(2, COLORS.soot, 0.6).strokeRoundedRect(-45, -20, 90, 40, 20);
      t.setText(on ? 'On' : 'Off').setX(on ? -14 : 14).setColor(on ? CSS.cream : CSS.indigo);
    };
    c.on('pointerup', () => {
      Sfx.click();
      on = !on;
      draw();
      onChange(on);
    });
    draw();
  }

  segmented(x, y, labels, selected, onChange) {
    const cells = [];
    const draw = () =>
      cells.forEach((cell, i) => {
        cell.g.clear();
        cell.g.fillStyle(i === selected ? COLORS.marigold : COLORS.indigo, i === selected ? 1 : 0.18).fillRoundedRect(-48, -22, 96, 44, 10);
        cell.g.lineStyle(2, COLORS.soot, 0.6).strokeRoundedRect(-48, -22, 96, 44, 10);
        cell.t.setColor(i === selected ? CSS.soot : CSS.indigo);
      });
    labels.forEach((str, i) => {
      const c = this.add.container(x + 50 + i * 108, y).setDepth(3);
      const g = this.add.graphics();
      const t = text(this, 0, 0, str, { size: 22, bold: true, shadow: false, depth: 0 });
      c.add([g, t]);
      c.setSize(96, 44);
      c.setInteractive(new Phaser.Geom.Rectangle(0, 0, 96, 44), Phaser.Geom.Rectangle.Contains);
      if (c.input) c.input.cursor = 'pointer';
      c.on('pointerup', () => {
        Sfx.click();
        selected = i;
        draw();
        onChange(i);
      });
      cells.push({ g, t });
    });
    draw();
  }
}
