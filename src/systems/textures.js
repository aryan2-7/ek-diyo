// Textures that are drawn in code (so they never block on generated art):
// light/glow gradients, paper-cut flame, wick, embers, petals, sparkle star, Night 2 gate.
import { COLORS } from '../config.js';

const css = (n) => '#' + n.toString(16).padStart(6, '0');

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext(), w, h);
  tex.refresh();
}

function radial(ctx, size, stops) {
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

// teardrop flame outline
function drop(ctx, cx, top, bottom, w) {
  const mid = bottom - w * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + w * 0.1, top + (mid - top) * 0.45, cx + w * 0.5, mid - w * 0.05, cx + w * 0.5, mid);
  ctx.arc(cx, mid, w * 0.5, 0, Math.PI, false);
  ctx.bezierCurveTo(cx - w * 0.5, mid - w * 0.05, cx - w * 0.1, top + (mid - top) * 0.45, cx, top);
  ctx.closePath();
}

export function makeTextures(scene) {
  // light stamp - erased out of the dark overlay
  canvasTex(scene, 'light', 512, 512, (ctx) =>
    radial(ctx, 512, [
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.93)'],
      [0.65, 'rgba(255,255,255,0.45)'],
      [0.85, 'rgba(255,255,255,0.12)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );

  // warm glow (drawn additively)
  canvasTex(scene, 'glow', 256, 256, (ctx) =>
    radial(ctx, 256, [
      [0, 'rgba(255,190,80,0.60)'],
      [0.4, 'rgba(255,150,50,0.22)'],
      [1, 'rgba(255,120,30,0)'],
    ]),
  );

  canvasTex(scene, 'ember', 24, 24, (ctx) =>
    radial(ctx, 24, [
      [0, 'rgba(255,240,200,1)'],
      [0.4, 'rgba(255,190,80,0.9)'],
      [1, 'rgba(255,120,30,0)'],
    ]),
  );

  // paper-cut flame: three flat layers, no gradients
  canvasTex(scene, 'flame', 96, 144, (ctx) => {
    ctx.fillStyle = css(COLORS.marigold);
    drop(ctx, 48, 4, 140, 66);
    ctx.fill();
    ctx.fillStyle = css(COLORS.turmeric);
    drop(ctx, 48, 38, 134, 44);
    ctx.fill();
    ctx.fillStyle = '#FFF3CF';
    drop(ctx, 48, 80, 128, 22);
    ctx.fill();
  });

  // cream cloth wick for extra wicks
  canvasTex(scene, 'wick', 24, 40, (ctx) => {
    ctx.fillStyle = css(COLORS.cream);
    ctx.beginPath();
    ctx.moveTo(4, 40);
    ctx.lineTo(8, 4);
    ctx.quadraticCurveTo(12, 0, 16, 4);
    ctx.lineTo(20, 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(26,23,20,0.25)';
    ctx.fillRect(10, 8, 3, 30);
  });

  canvasTex(scene, 'star', 40, 40, (ctx) => {
    ctx.fillStyle = css(COLORS.turmeric);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(22, 18, 40, 20);
    ctx.quadraticCurveTo(22, 22, 20, 40);
    ctx.quadraticCurveTo(18, 22, 0, 20);
    ctx.quadraticCurveTo(18, 18, 20, 0);
    ctx.fill();
  });

  canvasTex(scene, 'petal', 28, 16, (ctx) => {
    ctx.fillStyle = css(COLORS.marigold);
    ctx.beginPath();
    ctx.ellipse(14, 8, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(COLORS.turmeric);
    ctx.beginPath();
    ctx.ellipse(12, 8, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Night 2 gate: two vermilion pillars, indigo lintel, hanging marigold string
  canvasTex(scene, 'gate', 380, 440, (ctx, w, h) => {
    const shadow = (fn) => {
      ctx.save();
      ctx.translate(7, 8);
      ctx.fillStyle = 'rgba(26,23,20,0.35)';
      fn();
      ctx.restore();
    };
    const pillars = () => {
      ctx.fillRect(18, 90, 62, h - 90);
      ctx.fillRect(w - 80, 90, 62, h - 90);
    };
    const lintel = () => ctx.fillRect(0, 44, w, 62);
    shadow(pillars);
    shadow(lintel);
    ctx.fillStyle = css(COLORS.vermilion);
    pillars();
    ctx.fillStyle = css(COLORS.cream);
    for (let y = 150; y < h - 20; y += 70) {
      ctx.fillRect(18, y, 62, 12);
      ctx.fillRect(w - 80, y, 62, 12);
    }
    ctx.fillStyle = css(COLORS.indigo);
    lintel();
    ctx.fillStyle = css(COLORS.marigold);
    ctx.fillRect(0, 44, w, 8);
    ctx.fillRect(0, 98, w, 8);
    // little roof peak
    ctx.fillStyle = css(COLORS.vermilion);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 70, 44);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 2 + 70, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(COLORS.turmeric);
    ctx.beginPath();
    ctx.arc(w / 2, 22, 9, 0, Math.PI * 2);
    ctx.fill();
    // hanging marigolds
    for (let i = 0; i <= 14; i++) {
      const x = 80 + (i * (w - 160)) / 14;
      const y = 112 + Math.sin((i / 14) * Math.PI) * 34;
      ctx.fillStyle = i % 2 ? css(COLORS.marigold) : css(COLORS.turmeric);
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
