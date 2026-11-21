import Phaser from 'phaser';
import { ASSETS } from '../data/assets.js';
import { Assets, missingTextures } from '../systems/loading.js';

const RETRIES = 3; // quiet retries, a little further apart each time, before the player is told

/** Loads the rest of the art in the background while the title screen is up, so the first paint is quick. */
export default class BgLoad extends Phaser.Scene {
  constructor() {
    super('BgLoad');
  }

  create() {
    Assets.failed = [];
    this.load.setPath('assets/');
    this.load.off('progress').off('loaderror'); // the loader is kept between runs: do not stack listeners on a retry
    this.load.on('progress', (v) => (Assets.progress = v));
    this.load.on('loaderror', (file) => console.warn(`Could not load ${file.key}`));
    this.run(ASSETS.filter((id) => !this.textures.exists(id)), 0);
  }

  /** Load these pictures; whichever fail are tried again (with a cache-busting suffix) a moment later. */
  run(ids, attempt) {
    if (!ids.length) return this.finish([]);
    ids.forEach((id) => this.load.image(id, `${id}.webp${attempt ? `?retry=${attempt}` : ''}`));
    this.load.once('complete', () => {
      const lost = missingTextures(this, ids);
      if (lost.length && attempt < RETRIES) this.time.delayedCall(1200 * (attempt + 1), () => this.run(lost, attempt + 1));
      else this.finish(lost);
    });
    this.load.start();
    return undefined;
  }

  finish(lost) {
    Assets.failed = lost;
    Assets.ready = true;
    Assets.progress = 1;
    this.game.events.emit('assets-ready');
    this.scene.stop();
  }
}
