import Phaser from 'phaser';
import { W, H, CSS, COLORS, FONT_TITLE, FONT_HAND } from '../config.js';
import { ASSETS, CORE_ASSETS } from '../data/assets.js';
import { NIGHTS, PROLOGUE } from '../data/nights.js';
import { makeTextures } from '../systems/textures.js';
import { Sfx } from '../systems/sfx.js';
import { Assets, missingTextures } from '../systems/loading.js';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.cameras.main.setBackgroundColor(CSS.soot);
    this.add.text(W / 2, H / 2 - 50, 'Ek Diyo', { fontFamily: FONT_TITLE, fontSize: '68px', color: CSS.cream }).setOrigin(0.5).setResolution(2);
    this.status = this.add.text(W / 2, H / 2 + 10, 'lighting the diya…', { fontFamily: FONT_HAND, fontSize: '26px', color: CSS.turmeric }).setOrigin(0.5).setResolution(2);
    const bw = 420;
    this.add.rectangle(W / 2, H / 2 + 62, bw, 10, COLORS.indigo).setOrigin(0.5);
    const bar = this.add.rectangle(W / 2 - bw / 2, H / 2 + 62, 2, 10, COLORS.marigold).setOrigin(0, 0.5);
    this.bar = bar;
    this.load.on('progress', (v) => (bar.width = Math.max(2, bw * v)));
    this.load.setPath('assets/');
    // Normal visit: only the few pictures the title needs, so the first paint is quick; the rest loads in the
    // background (BgLoad). A direct link into the game (?night=3, ?card=2, ?scene=Ending) loads everything first.
    const q = new URLSearchParams(location.search);
    this.jump = ['night', 'card', 'scene'].some((k) => q.has(k));
    this.need = this.jump ? ASSETS : CORE_ASSETS;
    this.load.on('loaderror', (file) => console.warn(`Could not load ${file.key}`));
    this.need.forEach((id) => this.load.image(id, `${id}.webp`));
  }

  create() {
    // A picture that failed to load (flaky network) is tried again; if the title's own pictures still will not come, say so.
    const lost = missingTextures(this, this.need);
    if (lost.length) return this.retry(lost, 1);
    return this.begin();
  }

  /** Load the missing pictures again (a cache-busting suffix gets past a bad cached response), then carry on or give up. */
  retry(lost, attempt) {
    if (attempt > 3) return this.giveUp(lost);
    this.status?.setText(attempt === 1 ? 'the connection is slow…' : 'trying again…');
    this.time.delayedCall(900 * attempt, () => {
      lost.forEach((id) => this.load.image(id, `${id}.webp?retry=${attempt}`));
      this.load.once('complete', () => {
        const still = missingTextures(this, lost);
        if (still.length) this.retry(still, attempt + 1);
        else this.begin();
      });
      this.load.start();
    });
    return undefined;
  }

  giveUp() {
    this.status?.setText('');
    this.bar?.setFillStyle(COLORS.vermilion); // a full bar next to an error looks like success
    this.add.text(W / 2, H / 2 + 120, 'Some pictures could not be loaded.\nCheck your connection and try again.', {
      fontFamily: FONT_HAND, fontSize: '26px', color: CSS.cream, align: 'center',
    }).setOrigin(0.5).setResolution(2);
    const box = this.add.rectangle(W / 2, H / 2 + 220, 240, 58, COLORS.cream).setStrokeStyle(4, COLORS.indigo).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 220, 'Try again', { fontFamily: FONT_HAND, fontSize: '30px', fontStyle: 'bold', color: CSS.indigo }).setOrigin(0.5).setResolution(2);
    box.on('pointerup', () => window.location.reload());
    this.input.keyboard?.once('keydown-ENTER', () => window.location.reload());
  }

  begin() {
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
