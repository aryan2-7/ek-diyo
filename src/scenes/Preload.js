import Phaser from 'phaser';
import { W, H, CSS, COLORS, FONT_TITLE, FONT_HAND } from '../config.js';
import { ASSETS, CORE_ASSETS } from '../data/assets.js';
import { NIGHTS, PROLOGUE } from '../data/nights.js';
import { makeTextures } from '../systems/textures.js';
import { Sfx } from '../systems/sfx.js';
import { Assets } from '../systems/loading.js';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.cameras.main.setBackgroundColor(CSS.soot);
    this.add.text(W / 2, H / 2 - 50, 'Ek Diyo', { fontFamily: FONT_TITLE, fontSize: '68px', color: CSS.cream }).setOrigin(0.5).setResolution(2);
    this.add.text(W / 2, H / 2 + 10, 'lighting the diya…', { fontFamily: FONT_HAND, fontSize: '26px', color: CSS.turmeric }).setOrigin(0.5).setResolution(2);
    const bw = 420;
    this.add.rectangle(W / 2, H / 2 + 62, bw, 10, COLORS.indigo).setOrigin(0.5);
    const bar = this.add.rectangle(W / 2 - bw / 2, H / 2 + 62, 2, 10, COLORS.marigold).setOrigin(0, 0.5);
    this.load.on('progress', (v) => (bar.width = Math.max(2, bw * v)));
    this.load.setPath('assets/');
    // Normal visit: only the few pictures the title needs, so the first paint is quick; the rest loads in the
    // background (BgLoad). A direct link into the game (?night=3, ?card=2, ?scene=Ending) loads everything first.
    const q = new URLSearchParams(location.search);
    this.jump = ['night', 'card', 'scene'].some((k) => q.has(k));
    (this.jump ? ASSETS : CORE_ASSETS).forEach((id) => this.load.image(id, `${id}.webp`));
  }

  create() {
    makeTextures(this);
    Sfx.init(this.game);

    if (!this.jump) {
      this.scene.launch('BgLoad');
      this.scene.start('Title');
      return;
    }
    Assets.ready = true;
    Assets.progress = 1;

    // Handy for testing: ?night=3  ?scene=Ending  ?card=2
    const q = new URLSearchParams(location.search);
    const night = parseInt(q.get('night'), 10);
    const card = q.get('card');
    const scene = q.get('scene');
    if (night >= 1 && night <= 5) this.scene.start(NIGHTS[night].scene);
    else if (card !== null) {
      const n = parseInt(card, 10);
      if (Number.isNaN(n) || n < 0 || n > 5) this.scene.start('Title'); // ?card=foo should not crash
      else if (n === 0) this.scene.start('StoryCard', { night: 0, card: PROLOGUE, stats: [], next: 'Night1', wicksBefore: 0 });
      else
        this.scene.start('StoryCard', {
          night: n,
          card: { ...NIGHTS[n].card, bg: NIGHTS[n].bg },
          stats: [{ label: 'Test', value: '10/10' }],
          next: NIGHTS[n].next,
          wicksBefore: n,
        });
    } else if (scene && !['Pause', 'Settings', 'Credits', 'Album', 'BgLoad'].includes(scene) && this.scene.manager.keys[scene]) this.scene.start(scene);
    else this.scene.start('Title');
  }
}
