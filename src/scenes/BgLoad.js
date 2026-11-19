import Phaser from 'phaser';
import { ASSETS } from '../data/assets.js';
import { Assets } from '../systems/loading.js';

/** Loads the rest of the art in the background while the title screen is up, so the first paint is quick. */
export default class BgLoad extends Phaser.Scene {
  constructor() {
    super('BgLoad');
  }

  create() {
    const todo = ASSETS.filter((id) => !this.textures.exists(id));
    const done = () => {
      Assets.ready = true;
      Assets.progress = 1;
      this.game.events.emit('assets-ready');
      this.scene.stop();
    };
    if (!todo.length) return done();
    this.load.setPath('assets/');
    todo.forEach((id) => this.load.image(id, `${id}.webp`));
    this.load.on('progress', (v) => (Assets.progress = v));
    this.load.once('complete', done);
    this.load.start();
    return undefined;
  }
}
