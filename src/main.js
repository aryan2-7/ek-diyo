import Phaser from 'phaser';
// Latin only from the packages; the few Devanagari words use tiny subset files (see styles.css, tools/subset_fonts.py)
import '@fontsource/yatra-one/latin-400.css';
import '@fontsource/kalam/latin-400.css';
import '@fontsource/kalam/latin-700.css';
import './styles.css';
import { W, H } from './config.js';
import { settings } from './systems/settings.js';
import { Quality } from './systems/quality.js';
import { Render } from './systems/render.js';
import { Music } from './systems/music.js';
import { Sfx } from './systems/sfx.js';
import Preload from './scenes/Preload.js';
import BgLoad from './scenes/BgLoad.js';
import Title from './scenes/Title.js';
import StoryCard from './scenes/StoryCard.js';
import Night1 from './scenes/Night1.js';
import Night2 from './scenes/Night2.js';
import Night3 from './scenes/Night3.js';
import Night4 from './scenes/Night4.js';
import Night5 from './scenes/Night5.js';
import Ending from './scenes/Ending.js';
import Pause from './scenes/Pause.js';
import Settings from './scenes/Settings.js';
import Credits from './scenes/Credits.js';
import Album from './scenes/Album.js';

// No right-click menu, and right/middle clicks never reach the game (they used to fire drops, jumps and button presses).
// Capture phase on window, so this runs before Phaser or any page element sees the event.
['contextmenu', 'auxclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((type) =>
  window.addEventListener(
    type,
    (e) => {
      if (type === 'contextmenu' || e.button !== 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true },
  ),
);

// If our own code throws, say so (and offer a reload) instead of freezing silently
let oopsShown = false;
window.addEventListener('error', (e) => {
  if (oopsShown || !/\/assets\/|\/src\//.test(e.filename || '')) return; // ignore extensions and other pages' scripts
  oopsShown = true;
  const d = document.createElement('div');
  d.id = 'oops';
  d.innerHTML = '<span>Something went wrong.</span> <button>Reload</button>';
  d.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(d);
});

// "Reduce motion" also turns off the screen shake
const camShake = Phaser.Cameras.Scene2D.Camera.prototype.shake;
Phaser.Cameras.Scene2D.Camera.prototype.shake = function shake(...args) {
  return settings.reduceMotion ? this : camShake.apply(this, args);
};

// The game is laid out in 1280x720 units but can be drawn at 1.5x or 2x (see systems/render.js):
// every scene's camera is zoomed from its top-left corner so nothing else has to know.
const camStart = Phaser.Cameras.Scene2D.CameraManager.prototype.start;
Phaser.Cameras.Scene2D.CameraManager.prototype.start = function start(...args) {
  camStart.apply(this, args);
  if (this.main) this.main.setOrigin(0, 0).setZoom(Render.scale);
};

Render.init();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W * Render.scale,
  height: H * Render.scale,
  backgroundColor: '#1A1714',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  disableContextMenu: true,
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [Preload, BgLoad, Title, StoryCard, Night1, Night2, Night3, Night4, Night5, Ending, Pause, Settings, Credits, Album],
};

async function start() {
  // make sure the festival fonts are ready before any text is drawn
  try {
    await Promise.all([
      document.fonts.load('40px "Yatra One"'),
      document.fonts.load('24px Kalam'),
      document.fonts.load('bold 24px Kalam'),
      document.fonts.load('24px Kalam', 'तिहार'),
      document.fonts.load('bold 24px Kalam', 'तिहार'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const game = new Phaser.Game(config);
  document.getElementById('boot')?.remove();
  Render.watch(game);

  // Full screen on the very first tap or key press (browsers only allow it after a gesture). F or Esc leaves it.
  if (settings.fullscreen) {
    const enter = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') return;
      ['pointerup', 'keydown', 'touchend'].forEach((t) => window.removeEventListener(t, enter, true));
      if (!game.scale.fullscreen.available || game.scale.isFullscreen) return;
      game.scale.startFullscreen();
      setTimeout(() => {
        try {
          screen.orientation?.lock?.('landscape')?.catch?.(() => {});
        } catch {
          /* not allowed here */
        }
      }, 400);
    };
    ['pointerup', 'keydown', 'touchend'].forEach((t) => window.addEventListener(t, enter, true));
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.__game = game;
    window.__dbg = { Sfx, Music, Quality, Render, settings };
  }
}

start();
