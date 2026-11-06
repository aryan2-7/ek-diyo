import Phaser from 'phaser';
// Latin only from the packages; the few Devanagari words use tiny subset files (see styles.css, tools/subset_fonts.py)
import '@fontsource/yatra-one/latin-400.css';
import '@fontsource/kalam/latin-400.css';
import '@fontsource/kalam/latin-700.css';
import './styles.css';
import { W, H } from './config.js';
import Preload from './scenes/Preload.js';
import Title from './scenes/Title.js';
import StoryCard from './scenes/StoryCard.js';
import Night1 from './scenes/Night1.js';
import Night2 from './scenes/Night2.js';
import Night3 from './scenes/Night3.js';
import Night4 from './scenes/Night4.js';
import Night5 from './scenes/Night5.js';
import Ending from './scenes/Ending.js';
import Pause from './scenes/Pause.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#1A1714',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [Preload, Title, StoryCard, Night1, Night2, Night3, Night4, Night5, Ending, Pause],
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
  if (new URLSearchParams(location.search).has('debug')) window.__game = game;
}

start();
