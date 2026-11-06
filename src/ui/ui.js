import Phaser from 'phaser';
import { W, H, COLORS, CSS, FONT_TITLE, FONT_HAND } from '../config.js';
import { Sfx } from '../systems/sfx.js';

/** Text with the game's fonts, crisp on high-DPI screens, with a soft paper-shadow. */
export function text(scene, x, y, str, o = {}) {
  const {
    font = FONT_HAND, size = 28, color = CSS.cream, bold = false, align = 'center',
    origin = [0.5, 0.5], shadow = true, wrap = 0, spacing = 0, depth = 900,
  } = o;
  const t = scene.add
    .text(x, y, str, {
      fontFamily: font,
      fontSize: size + 'px',
      color,
      fontStyle: bold ? 'bold' : 'normal',
      align,
      wordWrap: wrap ? { width: wrap } : undefined,
      lineSpacing: spacing,
    })
    .setOrigin(origin[0], origin[1])
    .setResolution(2)
    .setDepth(depth);
  if (shadow) t.setShadow(2, 3, 'rgba(26,23,20,0.55)', 0, false, true);
  return t;
}

export const titleText = (scene, x, y, str, o = {}) => text(scene, x, y, str, { font: FONT_TITLE, ...o });

/** Torn-edge paper rectangle, drawn into a Graphics object. (x,y) is the top-left corner. */
export function tornPaper(g, x, y, w, h, { fill = COLORS.cream, alpha = 1, amp = 2.5, step = 20, seed = 7, shadow = true } = {}) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647 - 0.5) * 2 * amp;
  };
  const pts = [];
  for (let i = 0; i <= w; i += step) pts.push({ x: x + i, y: y + rnd() });
  for (let j = 0; j <= h; j += step) pts.push({ x: x + w + rnd(), y: y + j });
  for (let i = w; i >= 0; i -= step) pts.push({ x: x + i, y: y + h + rnd() });
  for (let j = h; j >= 0; j -= step) pts.push({ x: x + rnd(), y: y + j });
  if (shadow) {
    g.fillStyle(COLORS.soot, 0.35);
    g.fillPoints(pts.map((p) => ({ x: p.x + 4, y: p.y + 6 })), true);
  }
  g.fillStyle(fill, alpha);
  g.fillPoints(pts, true);
}

/** Paper button. */
export function button(scene, x, y, label, onClick, { w = 300, h = 64, size = 30, depth = 910 } = {}) {
  const c = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  tornPaper(g, -w / 2, -h / 2, w, h, { seed: Math.round(x + y) | 1 });
  g.lineStyle(2.5, COLORS.indigo, 0.9);
  g.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 8);
  const t = text(scene, 0, 1, label, { size, color: CSS.indigo, bold: true, shadow: false, depth: 0 });
  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 120 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
  c.on('pointerup', () => {
    Sfx.click();
    onClick();
  });
  return c;
}

export function go(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(450, 26, 23, 20);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export const fadeIn = (scene, ms = 600) => scene.cameras.main.fadeIn(ms, 26, 23, 20);

/** Faint paper grain over the whole picture. */
export function paperGrain(scene, alpha = 0.2) {
  return scene.add
    .tileSprite(0, 0, W, H, 'paper_bg')
    .setOrigin(0)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(alpha)
    .setDepth(850);
}

/** Cover-fit a background image to the screen. */
export function coverBg(scene, key, depth = 0) {
  const img = scene.add.image(W / 2, H / 2, key).setDepth(depth);
  img.setScale(Math.max(W / img.width, H / img.height));
  return img;
}

/** Big paper banner announcing a night. Returns the container (use keep: true to fade it out yourself). */
export function banner(scene, { kicker, title, sub }, { hold = 2600, keep = false } = {}) {
  const w = 780;
  const h = 170;
  const c = scene.add.container(W / 2, 250).setDepth(950).setAlpha(0);
  const g = scene.add.graphics();
  tornPaper(g, -w / 2, -h / 2, w, h, { seed: 11 });
  g.lineStyle(2, COLORS.indigo, 0.55);
  g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
  c.add([
    g,
    text(scene, 0, -52, kicker, { size: 22, color: CSS.vermilion, bold: true, shadow: false, depth: 0 }),
    titleText(scene, 0, -6, title, { size: 52, color: CSS.indigo, shadow: false, depth: 0 }),
    text(scene, 0, 48, sub, { size: 24, color: CSS.soot, shadow: false, depth: 0, wrap: w - 80 }),
  ]);
  c.setScale(0.92);
  scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 550, ease: 'Back.easeOut' });
  if (!keep) scene.tweens.add({ targets: c, alpha: 0, y: 225, delay: hold, duration: 700, onComplete: () => c.destroy() });
  return c;
}

/**
 * How-to-play panel: the night banner plus a "Got it" button, so the level only starts
 * when the player says so. onGo fires just after the panel fades away.
 */
const seenTutorial = new Set(); // nights whose how-to-play panel was already shown this visit

export function instructions(scene, info, onGo, { delay = 450 } = {}) {
  // replays (Try again, restart, picking the night again) skip the panel: just the title for a beat, then play
  if (seenTutorial.has(info.kicker)) {
    banner(scene, info, { hold: 1100 });
    scene.time.delayedCall(450, onGo);
    return;
  }
  seenTutorial.add(info.kicker);
  const panel = banner(scene, info, { keep: true });
  let btn = null;
  let done = false;
  const dismiss = () => {
    if (done) return;
    done = true;
    KEYS.forEach((k) => scene.input.keyboard.off(k, dismiss));
    btn?.destroy();
    scene.tweens.add({ targets: panel, alpha: 0, y: 225, duration: 500, onComplete: () => panel.destroy() });
    scene.time.delayedCall(360, onGo);
  };
  const KEYS = ['keydown-SPACE', 'keydown-ENTER'];
  KEYS.forEach((k) => scene.input.keyboard.on(k, dismiss));
  scene.time.delayedCall(delay, () => {
    btn = button(scene, W / 2, 396, 'Got it', dismiss, { w: 200, h: 54, size: 26, depth: 951 });
    btn.setAlpha(0);
    scene.tweens.add({ targets: btn, alpha: 1, duration: 300 });
  });
}

/** A small paper pill with a hint. Returns the container so callers can fade it. */
export function hintPill(scene, str, y = H - 46) {
  const t = text(scene, W / 2, y, str, { size: 24, color: CSS.indigo, shadow: false, depth: 0 });
  const w = t.width + 56;
  const c = scene.add.container(W / 2, y).setDepth(920);
  const g = scene.add.graphics();
  tornPaper(g, -w / 2, -24, w, 48, { seed: 5, amp: 1.8 });
  t.setPosition(0, 0);
  c.add([g, t]);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 500, delay: 800 });
  return c;
}

/** Wire up the M (mute) and F (fullscreen) keys in any scene. */
export function globalKeys(scene) {
  scene.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
  scene.input.keyboard.on('keydown-F', () => scene.scale.toggleFullscreen());
}

/** Wrap a scene-level pointer handler so it ignores taps that landed on a button or HUD icon. */
export const canvasOnly = (fn) => (p, over) => {
  if (!over || !over.length) fn(p);
};

/**
 * Small speaker (and optional pause) icons so touch players can mute and pause.
 * pause: true also wires Esc / P to the pause menu. Returns nothing; clean-up is automatic.
 */
export function hudButtons(scene, { pause = false, x = W / 2 - 34, y = 44 } = {}) {
  const make = (cx, draw, onClick) => {
    const c = scene.add.container(cx, y).setDepth(960);
    const g = scene.add.graphics();
    tornPaper(g, -25, -22, 50, 44, { seed: Math.round(cx) | 1, amp: 1.6 });
    const icon = scene.add.graphics();
    c.add([g, icon]);
    c.setSize(60, 54);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, 60, 54), Phaser.Geom.Rectangle.Contains);
    if (c.input) c.input.cursor = 'pointer';
    c.on('pointerup', () => {
      Sfx.click();
      onClick();
    });
    draw(icon);
    return { c, icon, draw };
  };

  const drawSpeaker = (icon) => {
    icon.clear();
    icon.fillStyle(COLORS.indigo, 1);
    icon.fillPoints([{ x: -11, y: -5 }, { x: -5, y: -5 }, { x: 3, y: -12 }, { x: 3, y: 12 }, { x: -5, y: 5 }, { x: -11, y: 5 }], true);
    icon.lineStyle(3, COLORS.indigo, 1);
    if (Sfx.muted) {
      icon.lineStyle(3.5, COLORS.vermilion, 1);
      icon.lineBetween(8, -8, 18, 8);
      icon.lineBetween(18, -8, 8, 8);
    } else {
      icon.beginPath();
      icon.arc(5, 0, 8, -0.9, 0.9);
      icon.strokePath();
      icon.beginPath();
      icon.arc(5, 0, 14, -0.9, 0.9);
      icon.strokePath();
    }
  };
  const sound = make(x, drawSpeaker, () => Sfx.toggleMute());
  let shown = Sfx.muted;
  const refresh = () => {
    if (shown !== Sfx.muted) {
      shown = Sfx.muted;
      drawSpeaker(sound.icon);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, refresh));

  if (pause) {
    make(x + 68, (icon) => {
      icon.fillStyle(COLORS.indigo, 1);
      icon.fillRoundedRect(-9, -11, 6, 22, 2);
      icon.fillRoundedRect(3, -11, 6, 22, 2);
    }, () => openPause(scene));
    scene.input.keyboard.on('keydown-ESC', () => openPause(scene));
    scene.input.keyboard.on('keydown-P', () => openPause(scene));
  }
}

/** Freeze this scene and show the pause menu on top. */
export function openPause(scene) {
  if (scene._leaving || scene.scene.isPaused() || scene.scene.isSleeping()) return;
  scene.scene.pause();
  scene.scene.launch('Pause', { from: scene.scene.key });
}

/** The shared "you lost" overlay: dim the scene, say why, offer Try again / Back to the start. */
export function loseScreen(scene, title, line, { size = 64 } = {}) {
  scene.add.rectangle(0, 0, W, H, COLORS.soot, 0.5).setOrigin(0).setDepth(940);
  titleText(scene, W / 2, 250, title, { size, color: CSS.cream, depth: 950 });
  if (line) text(scene, W / 2, 316, line, { size: 26, color: CSS.turmeric, depth: 950 });
  button(scene, W / 2, 410, 'Try again', () => scene.scene.restart(), { w: 300, h: 64, size: 30 });
  button(scene, W / 2, 490, 'Back to the start', () => go(scene, 'Title'), { w: 300, h: 56, size: 24 });
}
