import { SLOTS_FIVE } from '../systems/Flame.js';
import { drawFlame } from './draw.js';

/**
 * A "Shubha Tihar" greeting card: type two names, save the picture or share it.
 * It is a small HTML overlay (real text boxes work much better than game text on phones) drawn onto a canvas.
 */
export function openGreeting(scene) {
  if (scene?.scale?.isFullscreen) {
    scene.scale.stopFullscreen();
    setTimeout(() => openGreeting(scene), 300);
    return;
  }
  if (document.getElementById('greet')) return;
  const root = document.createElement('div');
  root.id = 'greet';
  root.innerHTML = `
    <div class="gpanel" role="dialog" aria-label="Greeting card">
      <div class="gform">
        <h2>A Shubha Tihar card</h2>
        <p>Write who it is for and who it is from, then save the picture or share it.</p>
        <label>To<input id="g-to" maxlength="22" placeholder="Didi" autocomplete="off" /></label>
        <label>From<input id="g-from" maxlength="22" placeholder="Your name" autocomplete="off" /></label>
        <div class="gbtns">
          <button id="g-save">Save card</button>
          <button id="g-share">Share</button>
          <button id="g-close" class="ghost">Close</button>
        </div>
      </div>
      <canvas id="g-canvas" width="1080" height="1350"></canvas>
    </div>`;
  const host = document.getElementById('game') || document.body;
  host.appendChild(root);
  const $ = (q) => root.querySelector(q);
  const canvas = $('#g-canvas');
  const to = $('#g-to');
  const from = $('#g-from');
  const draw = () => drawCard(canvas, scene, to.value.trim(), from.value.trim());
  const close = () => root.remove();
  // keys typed here must not reach the game (M mutes, Space jumps...)
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
  });
  root.addEventListener('keyup', (e) => e.stopPropagation());
  to.addEventListener('input', draw);
  from.addEventListener('input', draw);
  $('#g-close').onclick = close;
  $('#g-save').onclick = () =>
    canvas.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'shubha-tihar-card.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, 'image/png');
  $('#g-share').onclick = () =>
    canvas.toBlob(async (b) => {
      const file = new File([b], 'shubha-tihar-card.png', { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Shubha Tihar', text: 'Shubha Tihar!' });
        else $('#g-save').click();
      } catch {
        /* share cancelled */
      }
    }, 'image/png');
  if (!navigator.share) $('#g-share').style.display = 'none';
  draw();
  to.focus();
}

/**
 * The card is drawn at 1.5x (1080 x 1350) so the saved picture is sharp. The lamp is drawn from the game's own lamp picture
 * and five flames, on a night-sky panel (it used to be a photo of the ending screen, which had the screen's text in it).
 */
function drawCard(canvas, scene, to, from) {
  const ctx = canvas.getContext('2d');
  const K = canvas.width / 720;
  ctx.setTransform(K, 0, 0, K, 0, 0);
  const W = 720;
  const H = 900;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#EFE2C4';
  ctx.fillRect(0, 0, W, H);
  try {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(scene.textures.get('paper_bg').getSourceImage(), 0, 0, W, H);
  } catch {
    /* no paper texture: plain cream */
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#1D2540';
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, W - 84, H - 84);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#C8432B';
  ctx.font = '700 34px Kalam, cursive';
  ctx.fillText('तिहार', W / 2, 104);
  ctx.fillStyle = '#1D2540';
  ctx.font = '84px "Yatra One", serif';
  ctx.fillText('Shubha Tihar', W / 2, 196);
  ctx.fillStyle = '#B07A1E';
  ctx.font = '700 34px Kalam, cursive';
  ctx.fillText('शुभ तिहार', W / 2, 248);

  // the lamp panel: night sky, a warm halo, the five-wick lamp with its flames
  const fx = W / 2 - 190;
  const fy = 276;
  const fw = 380;
  const fh = 360;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(fx, fy, fw, fh, 20);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, fy, 0, fy + fh);
  sky.addColorStop(0, '#2a3262');
  sky.addColorStop(1, '#141733');
  ctx.fillStyle = sky;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = 'rgba(255,240,200,0.85)';
  [[40, 30], [120, 60], [300, 40], [340, 90], [70, 120], [335, 160], [200, 22], [250, 72], [28, 210], [352, 236], [60, 300], [320, 310]].forEach(([sx, sy], i) => {
    ctx.beginPath();
    ctx.arc(fx + sx, fy + sy, i % 3 ? 1.6 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  const halo = ctx.createRadialGradient(W / 2, fy + fh * 0.5, 10, W / 2, fy + fh * 0.5, 210);
  halo.addColorStop(0, 'rgba(255,176,64,0.5)');
  halo.addColorStop(1, 'rgba(255,176,64,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(fx, fy, fw, fh);
  try {
    const lamp = scene.textures.get('five_diya').getSourceImage();
    const lw = 270;
    const lh = (lw * lamp.height) / lamp.width;
    const lx = W / 2 - lw / 2;
    const ly = fy + fh / 2 - lh / 2 + 10;
    ctx.drawImage(lamp, lx, ly, lw, lh);
    SLOTS_FIVE.forEach((s) => drawFlame(ctx, lx + s.x * lw, ly + s.y * lh + 4, lw * 0.2));
  } catch {
    /* no lamp picture: just the sky */
  }
  ctx.restore();
  ctx.strokeStyle = '#1D2540';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(fx, fy, fw, fh, 20);
  ctx.stroke();

  ctx.fillStyle = '#1D2540';
  ctx.font = '30px Kalam, cursive';
  ctx.fillText('May your home be bright,', W / 2, 686);
  ctx.fillText('and every day be thanked.', W / 2, 724);
  ctx.font = '700 32px Kalam, cursive';
  if (to) ctx.fillText(`For ${to}`, W / 2, 776);
  ctx.font = '28px Kalam, cursive';
  if (from) ctx.fillText(`with love, ${from}`, W / 2, to ? 814 : 782);
  ctx.fillStyle = '#7a6a4a';
  ctx.font = '20px Kalam, cursive';
  ctx.fillText('Ek Diyo · a Tihar game', W / 2, 846);
}
