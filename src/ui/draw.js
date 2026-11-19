/** One paper-cut flame on a 2D canvas: its base sits at (x, y), h is its height. Used by the greeting card and the Day 4 story card. */
export function drawFlame(ctx, x, y, h) {
  const w = h * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - h * 0.5, 2, x, y - h * 0.5, h * 1.5);
  g.addColorStop(0, 'rgba(255,190,90,0.55)');
  g.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - h * 1.6, y - h * 2.1, h * 3.2, h * 3.2);
  ctx.restore();
  const drop = (k, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - h * k);
    ctx.bezierCurveTo(x + w * k * 0.9, y - h * k * 0.45, x + w * k * 0.6, y, x, y);
    ctx.bezierCurveTo(x - w * k * 0.6, y, x - w * k * 0.9, y - h * k * 0.45, x, y - h * k);
    ctx.fill();
  };
  drop(1, '#f2a33a');
  drop(0.72, '#f6d44c');
  drop(0.42, '#fff3cf');
}
