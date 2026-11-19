import Phaser from 'phaser';
import { W, H, COLORS, CSS, FONT_TITLE, FONT_HAND } from '../config.js';
import { Sfx } from '../systems/sfx.js';
import { Quality } from '../systems/quality.js';
import { settings } from '../systems/settings.js';
import { Assets } from '../systems/loading.js';

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
      // tall Devanagari marks and the shadow used to be clipped at the top of the text box
      padding: /[\u0900-\u097F]/.test(str) ? { left: 6, right: 6, top: 12, bottom: 8 } : undefined,
    })
    .setOrigin(origin[0], origin[1])
    .setResolution(2)
    .setDepth(depth);
  if (shadow) t.setShadow(2, 3, 'rgba(26,23,20,0.55)', 0, false, true);
  return t;
}

export const titleText = (scene, x, y, str, o = {}) => text(scene, x, y, str, { font: FONT_TITLE, ...o });

/** How much to enlarge touch targets: 1 on a laptop, up to 1.45 when the whole game is shown small (phones). */
export function uiScale(scene) {
  const w = scene.scale.displaySize?.width || W;
  return Phaser.Math.Clamp(1180 / w, 1, 1.45);
}

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

/** Paper button. The touch area is a little bigger than the picture. */
export function button(scene, x, y, label, onClick, { w = 300, h = 64, size = 30, depth = 910 } = {}) {
  const c = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  tornPaper(g, -w / 2, -h / 2, w, h, { seed: Math.round(x + y) | 1 });
  g.lineStyle(2.5, COLORS.indigo, 0.9);
  g.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 8);
  const t = text(scene, 0, 1, label, { size, color: CSS.indigo, bold: true, shadow: false, depth: 0 });
  c.add([g, t]);
  c.setSize(w + 16, h + 12);
  c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w + 16, h + 12), Phaser.Geom.Rectangle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  // on a phone the whole game is shown small: grow the button so it is still an easy target
  const us = uiScale(scene);
  const bs = us > 1.05 ? Math.min(1.3, us) : 1;
  c.setScale(bs);
  const desktop = scene.sys.game.device.os.desktop;
  c.on('pointerover', () => {
    if (desktop) Sfx.tick();
    scene.tweens.add({ targets: c, scale: bs * 1.06, duration: 120 });
  });
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: bs, duration: 120 }));
  c._click = () => {
    Sfx.click();
    onClick();
  };
  c.on('pointerup', () => c._click());
  return c;
}

/**
 * Keyboard control for a column of buttons: arrow keys or W / S move a highlight, Enter or Space presses it
 * (the mouse moves it too). Nothing happens before scene time readyAt, so a key held down from the game cannot press a button by accident.
 */
export function focusMenu(scene, buttons, { start = 0, readyAt = 0 } = {}) {
  let i = start;
  const ring = scene.add.graphics().setDepth(999).setAlpha(0);
  const tick = (time) => {
    const on = scene.time.now >= readyAt;
    ring.clear();
    ring.setAlpha(on ? 0.65 + 0.35 * Math.sin(time * 0.006) : 0);
    if (!on) return;
    const b = buttons[i];
    const w = b.width * b.scaleX;
    const h = b.height * b.scaleY;
    ring.lineStyle(5, COLORS.turmeric, 1).strokeRoundedRect(b.x - w / 2 - 3, b.y - h / 2 - 3, w + 6, h + 6, 12);
  };
  scene.events.on('update', tick);
  scene.events.once('shutdown', () => scene.events.off('update', tick));
  const move = (d) => {
    if (scene.time.now < readyAt) return;
    i = (i + d + buttons.length) % buttons.length;
    Sfx.tick();
  };
  const press = () => {
    if (scene.time.now >= readyAt) buttons[i]._click?.();
  };
  const kb = scene.input.keyboard;
  [['UP', -1], ['W', -1], ['LEFT', -1], ['DOWN', 1], ['S', 1], ['RIGHT', 1]].forEach(([k, d]) => kb.on(`keydown-${k}`, () => move(d)));
  ['ENTER', 'SPACE'].forEach((k) => kb.on(`keydown-${k}`, press));
  buttons.forEach((b, idx) => b.on('pointerover', () => (i = idx)));
}

// ---- scene changes: a sheet of torn paper wipes across the screen ------------------------------
let pendingWipe = false; // the next scene's fadeIn() should play the paper wipe-off instead of a fade

function makeWipe(scene) {
  const c = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  const pw = W + 300;
  const edge = (g, off, fill, a) => {
    g.fillStyle(fill, a);
    g.beginPath();
    g.moveTo(-pw - 60, -20);
    g.lineTo(off, -20);
    let seed = 11;
    for (let y = -20; y <= H + 20; y += 22) {
      seed = (seed * 16807) % 2147483647;
      g.lineTo(off + (seed / 2147483647) * 26, y); // the jagged, hand-torn leading edge
    }
    g.lineTo(off, H + 20);
    g.lineTo(-pw - 60, H + 20);
    g.closePath();
    g.fillPath();
  };
  const shade = scene.add.graphics();
  const paper = scene.add.graphics();
  edge(shade, 34, COLORS.soot, 0.92);
  edge(paper, 0, COLORS.cream, 1);
  c.add([shade, paper]);
  return c;
}

function waitForAssets(scene, then) {
  const veil = scene.add.rectangle(0, 0, W, H, COLORS.soot, 0.8).setOrigin(0).setDepth(3090);
  const label = text(scene, W / 2, H / 2, '', { size: 30, color: CSS.cream, depth: 3100 });
  const tick = scene.time.addEvent({
    delay: 100,
    loop: true,
    callback: () => label.setText(`lighting the lamps…  ${Math.round(Assets.progress * 100)}%`),
  });
  scene.game.events.once('assets-ready', () => {
    tick.remove();
    veil.destroy();
    label.destroy();
    then();
  });
}

/** Leave this scene for another one (waits for the background art loader if it is not finished). */
export function go(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  const start = () => scene.scene.start(key, data);
  const leave = () => {
    if (settings.reduceMotion) {
      scene.cameras.main.fadeOut(350, 26, 23, 20);
      scene.cameras.main.once('camerafadeoutcomplete', start);
      return;
    }
    pendingWipe = true;
    const w = makeWipe(scene);
    scene.tweens.add({ targets: w, x: W + 60, duration: 520, ease: 'Sine.easeInOut', onComplete: start });
  };
  if (Assets.ready || key === 'Title') leave();
  else waitForAssets(scene, leave);
}

export function fadeIn(scene, ms = 600) {
  if (pendingWipe && !settings.reduceMotion) {
    pendingWipe = false;
    const w = makeWipe(scene);
    w.x = W + 60;
    scene.tweens.add({ targets: w, x: 2 * W + 420, duration: 700, delay: 60, ease: 'Sine.easeInOut', onComplete: () => w.destroy() });
    return;
  }
  scene.cameras.main.fadeIn(ms, 26, 23, 20);
}

/** Faint paper grain over the whole picture (hidden on low quality: it is a full-screen blend). */
export function paperGrain(scene, alpha = 0.2) {
  const g = scene.add
    .tileSprite(0, 0, W, H, 'paper_bg')
    .setOrigin(0)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(alpha)
    .setDepth(850)
    .setVisible(!Quality.low);
  const off = Quality.onChange(() => g.setVisible(!Quality.low));
  scene.events.once('shutdown', off);
  return g;
}

/** Cover-fit a background image to the screen. breathe: a very slow zoom for calm screens (title, cards, ending). */
export function coverBg(scene, key, depth = 0, { breathe = false } = {}) {
  const img = scene.add.image(W / 2, H / 2, key).setDepth(depth);
  const s = Math.max(W / img.width, H / img.height);
  img.setScale(breathe ? s * 1.03 : s);
  if (breathe && !settings.reduceMotion) {
    scene.tweens.add({ targets: img, scale: s * 1.05, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return img;
}

/** Bakes a sticker-style outline (cream inner, soot outer) around a sprite so it reads on any background. Returns the padding. */
export function outlined(scene, src, key, inner = 8, outer = 6) {
  const pad = inner + outer + 2;
  if (!scene.textures.exists(key)) {
    const img = scene.textures.get(src).getSourceImage();
    const w = img.width + pad * 2;
    const h = img.height + pad * 2;
    const silhouette = (color, r) => {
      const s = document.createElement('canvas');
      s.width = img.width;
      s.height = img.height;
      const sx = s.getContext('2d');
      sx.drawImage(img, 0, 0);
      sx.globalCompositeOperation = 'source-in';
      sx.fillStyle = color;
      sx.fillRect(0, 0, s.width, s.height);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const cx = c.getContext('2d');
      for (let a = 0; a < 20; a++) cx.drawImage(s, pad + Math.cos((a / 20) * Math.PI * 2) * r, pad + Math.sin((a / 20) * Math.PI * 2) * r);
      return c;
    };
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.drawImage(silhouette(CSS.soot, inner + outer), 0, 0);
    ctx.drawImage(silhouette(CSS.cream, inner), 0, 0);
    ctx.drawImage(img, pad, pad);
    tex.refresh();
  }
  return pad;
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
  const panel = banner(scene, info, { keep: true });
  let btn = null;
  let done = false;
  const dismiss = () => {
    if (done) return;
    done = true;
    seenTutorial.add(info.kicker); // only counts once the player actually started the night
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

/**
 * Small text on a piece of torn paper, so it stays readable over any picture.
 * (x, y) is the anchor and anchor = [0.5, 0.5] centres it; fit = other strings the label may show, so the paper fits them all.
 */
export function labelPill(scene, x, y, str, { size = 22, depth = 30, anchor = [0.5, 0.5], fit = [], bold = true } = {}) {
  const label = text(scene, 0, 0, str, { size, color: CSS.indigo, bold, shadow: false, depth: 0 });
  let tw = label.width;
  fit.forEach((s) => {
    label.setText(s);
    tw = Math.max(tw, label.width);
  });
  label.setText(str);
  const w = tw + 40;
  const h = size + 24;
  const c = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  tornPaper(g, -w * anchor[0], -h * anchor[1], w, h, { seed: Math.round(x + y) | 1, amp: 1.8 });
  g.lineStyle(2, COLORS.indigo, 0.55);
  g.strokeRoundedRect(-w * anchor[0] + 6, -h * anchor[1] + 6, w - 12, h - 12, 7);
  label.setPosition(w * (0.5 - anchor[0]), h * (0.5 - anchor[1]));
  c.add([g, label]);
  return { container: c, label, width: w, height: h };
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

/** A short word that floats up and fades ("Steady!"). */
export function popText(scene, x, y, str, { color = CSS.turmeric, size = 30 } = {}) {
  const t = text(scene, x, y, str, { size, color, bold: true, depth: 960 });
  scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  return t;
}

/** Full screen on/off. On phones that allow it, also asks for landscape. */
export function toggleFullscreen(scene) {
  const sc = scene.scale;
  if (!sc.fullscreen.available) return;
  if (sc.isFullscreen) {
    sc.stopFullscreen();
    return;
  }
  sc.startFullscreen();
  setTimeout(() => {
    try {
      screen.orientation?.lock?.('landscape')?.catch?.(() => {});
    } catch {
      /* not allowed here */
    }
  }, 400);
}

/** Wire up the M (mute) and F (fullscreen) keys in any scene. */
export function globalKeys(scene) {
  scene.input.keyboard.on('keydown-M', () => Sfx.toggleMute());
  scene.input.keyboard.on('keydown-F', () => toggleFullscreen(scene));
}

/** Wrap a scene-level pointer handler so it ignores taps that landed on a button or HUD icon. */
export const canvasOnly = (fn) => (p, over) => {
  if (!over || !over.length) fn(p);
};

/**
 * Small icons so touch players can mute and pause (and, on the title, open settings or go fullscreen).
 * They grow on small screens. pause: true also wires Esc / P to the pause menu. Clean-up is automatic.
 */
export function hudButtons(scene, { pause = false, settings: withSettings = false, fullscreen = false, x = W / 2 - 34, y = 44 } = {}) {
  const s = uiScale(scene);
  const step = 68 * s;
  const make = (cx, draw, onClick) => {
    const c = scene.add.container(cx, y).setDepth(960).setScale(s);
    const g = scene.add.graphics();
    tornPaper(g, -25, -22, 50, 44, { seed: Math.round(cx) | 1, amp: 1.6 });
    const icon = scene.add.graphics();
    c.add([g, icon]);
    c.setSize(64, 58);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, 64, 58), Phaser.Geom.Rectangle.Contains);
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
  // UPDATE does not run while the scene is paused, so also refresh on RESUME (sound can be toggled in the pause menu)
  scene.events.on(Phaser.Scenes.Events.UPDATE, refresh);
  scene.events.on(Phaser.Scenes.Events.RESUME, refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, refresh);
    scene.events.off(Phaser.Scenes.Events.RESUME, refresh);
  });

  if (pause) {
    make(x + step, (icon) => {
      icon.fillStyle(COLORS.indigo, 1);
      icon.fillRoundedRect(-9, -11, 6, 22, 2);
      icon.fillRoundedRect(3, -11, 6, 22, 2);
    }, () => openPause(scene));
    scene.input.keyboard.on('keydown-ESC', () => openPause(scene));
    scene.input.keyboard.on('keydown-P', () => openPause(scene));
  }
  let slot = 1;
  if (withSettings) {
    make(x - step * slot++, (icon) => {
      icon.fillStyle(COLORS.indigo, 1);
      for (let i = 0; i < 8; i++) icon.fillCircle(Math.cos((i * Math.PI) / 4) * 11, Math.sin((i * Math.PI) / 4) * 11, 3.6);
      icon.fillCircle(0, 0, 9.5);
      icon.fillStyle(COLORS.cream, 1);
      icon.fillCircle(0, 0, 4);
    }, () => openSettings(scene));
  }
  if (fullscreen && scene.scale.fullscreen.available) {
    make(x - step * slot++, (icon) => {
      icon.lineStyle(3, COLORS.indigo, 1);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        icon.lineBetween(sx * 12, sy * 12, sx * 12, sy * 5);
        icon.lineBetween(sx * 12, sy * 12, sx * 5, sy * 12);
      });
    }, () => toggleFullscreen(scene));
  }
}

/** Freeze this scene and show the pause menu on top. */
export function openPause(scene) {
  if (scene._leaving || scene.scene.isPaused() || scene.scene.isSleeping()) return;
  scene.scene.pause();
  scene.scene.launch('Pause', { from: scene.scene.key });
}

/** Freeze this scene and show the settings on top (works from the title and from the pause menu). */
export function openSettings(scene) {
  if (scene._leaving || scene.scene.isPaused()) return;
  const from = scene.scene.key;
  scene.scene.pause();
  scene.scene.launch('Settings', { from });
}

/** The shared "you lost" overlay: dim the scene, say why, offer Try again / Back to the start. */
export function loseScreen(scene, title, line, { size = 64 } = {}) {
  scene.add.rectangle(0, 0, W, H, COLORS.soot, 0.5).setOrigin(0).setDepth(940);
  titleText(scene, W / 2, 250, title, { size, color: CSS.cream, depth: 950 });
  if (line) text(scene, W / 2, 316, line, { size: 26, color: CSS.turmeric, depth: 950 });
  const again = button(scene, W / 2, 410, 'Try again', () => scene.scene.restart(), { w: 300, h: 64, size: 30 });
  const back = button(scene, W / 2, 490, 'Back to the start', () => go(scene, 'Title'), { w: 300, h: 56, size: 24 });
  focusMenu(scene, [again, back], { readyAt: scene.time.now + 700 }); // Enter / Space retries, after a short pause
}
