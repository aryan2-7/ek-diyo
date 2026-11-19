import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS, NIGHT_LEVEL } from '../data/nights.js';
import { DiyaRig } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { Album } from '../systems/album.js';
import { fireflies } from '../systems/ambience.js';
import { text, titleText, button, go, fadeIn, coverBg, globalKeys, hudButtons } from '../ui/ui.js';
import { drawFlame } from '../ui/draw.js';

// The card text is fitted to the paper: the picture gives up a little room first, then the type shrinks (never below ~15px).
// y values are relative to the card's centre; the paper's border sits at about -300 and the "Festival fact" line at +262.
const LAYOUTS = [
  { art: 132, artY: -216, titleY: -120, bodyY: -90, maxH: 336, big: 22, min: 19 },
  { art: 104, artY: -230, titleY: -148, bodyY: -118, maxH: 364, big: 19, min: 17 },
  { art: 80, artY: -242, titleY: -172, bodyY: -144, maxH: 390, big: 17, min: 15 },
];

/**
 * Shown before Night 1 (prologue) and after every night:
 * a paper story card drops in, and one more wick is lit on the diya.
 * data = { night, card:{art,title,body,fact,bg}, stats:[{label,value}], next, wicksBefore }
 */
export default class StoryCard extends Phaser.Scene {
  constructor() {
    super('StoryCard');
  }

  init(data) {
    this.d = data;
    this._leaving = false;
  }

  create() {
    const { card, stats, next, wicksBefore, night } = this.d;
    fadeIn(this, 700);
    globalKeys(this);
    hudButtons(this, { x: W - 44 });
    Sfx.setLevel(NIGHT_LEVEL[night] ?? 1);
    Sfx.duck(true); // the music steps back while you read
    this.events.once('shutdown', () => Sfx.duck(false));

    coverBg(this, card.bg || 'title_bg', 0, { breathe: true }).setTint(0x3d3f5c);
    this.add.rectangle(0, 0, W, H, COLORS.soot, 0.28).setOrigin(0).setDepth(1);
    fireflies(this, { count: 8, area: [60, 300, 380, 360], depth: 3 });

    // the diya, gaining a wick
    this.add.image(230, 470, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(5).setAlpha(0.7).setDepth(2);
    this.rig = new DiyaRig(this, 230, 490, { width: 250, wicks: wicksBefore, depth: 10, texture: 'five_diya' });
    const lit = Math.min(wicksBefore + 1, 5);
    this.caption = text(
      this, 230, 676,
      night >= 5 ? 'All five wicks burn.' : `Wick ${lit} is lit.\nIt travels with you into Night ${lit}.`,
      { size: 26, color: CSS.turmeric, depth: 12, bold: true, spacing: 4 },
    ).setAlpha(0);

    // the card
    const c = this.add.container(W / 2 + 40, H / 2 + 4).setDepth(20);
    const frame = this.add.image(0, 0, 'card_frame');
    frame.setScale(664 / frame.height);
    if (card.art === 'card_hill') this.makeHill();
    const art = this.add.image(0, 0, card.art);
    const title = titleText(this, 0, 0, card.title, { size: 31, color: CSS.indigo, shadow: false, depth: 0, wrap: 380 });
    const body = text(this, 0, 0, card.body, { size: 22, color: CSS.soot, shadow: false, depth: 0, wrap: 372, spacing: 2, origin: [0.5, 0] });
    // long titles shrink to one line
    for (let size = 31; size > 22 && title.height > 44; size--) title.setFontSize(size + 'px');
    // pick the first layout in which the story fits
    let L = LAYOUTS[LAYOUTS.length - 1];
    for (const cand of LAYOUTS) {
      let fits = false;
      for (let size = cand.big; size >= cand.min; size--) {
        body.setFontSize(size + 'px');
        if (body.height <= cand.maxH) {
          fits = true;
          break;
        }
      }
      if (fits) {
        L = cand;
        break;
      }
      L = cand;
    }
    art.setScale(Math.min(L.art / art.height, 210 / art.width)).setY(L.artY);
    title.setY(L.titleY);
    body.setY(L.bodyY);
    // some cards have a festival-fact line at the bottom, others don't
    const parts = [frame, art, title, body];
    if (card.fact) parts.push(text(this, 0, 266, card.fact, { size: 18, color: CSS.vermilion, shadow: false, depth: 0, bold: true }));
    c.add(parts);
    c.setPosition(W / 2 + 40, -420).setAngle(-9);
    this.tweens.add({
      targets: c, y: H / 2 + 4, angle: -1.2, duration: 900, delay: 500, ease: 'Back.easeOut',
      onStart: () => Sfx.paper(),
    });

    // right side: the picture taken at the win (if there is one), then the results
    const shot = Album.shots[night];
    let y = 190;
    let gap = 130;
    let lab = 26;
    let val = 54;
    let dy = 46;
    if (night >= 1 && shot && this.textures.exists(shot)) {
      const p = this.add.container(1055, 196).setDepth(20).setAngle(3.5).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(COLORS.soot, 0.4).fillRect(-112, -92, 232, 192);
      g.fillStyle(COLORS.cream, 1).fillRect(-116, -96, 232, 192);
      const img = this.add.image(0, -22, shot);
      img.setScale(204 / img.width);
      const tape = this.add.rectangle(0, -100, 74, 22, COLORS.turmeric, 0.85).setAngle(-3);
      const cap = text(this, 0, 64, NIGHTS[night].name, { size: 22, color: CSS.indigo, bold: true, shadow: false, depth: 0 });
      p.add([g, img, tape, cap]);
      this.tweens.add({ targets: p, alpha: 1, angle: 2, duration: 700, delay: 1300, ease: 'Back.easeOut' });
      y = 336;
      gap = 88;
      lab = 22;
      val = 44;
      dy = 38;
    }
    stats.forEach((s) => {
      text(this, 1055, y, s.label, { size: lab, color: CSS.cream, depth: 20 }).setAlpha(0.9);
      titleText(this, 1055, y + dy, String(s.value), { size: val, color: CSS.turmeric, depth: 20 });
      y += gap;
    });

    // light the wick once the card has landed: one more voice joins the music with it
    // (on the prologue, the first wick waits for the "Light the first night" button)
    this.time.delayedCall(1700, () => {
      if (night === 0) return;
      if (lit <= 5 && night < 5) {
        this.rig.addWick();
        Sfx.setLevel(NIGHT_LEVEL[night + 1] ?? 5);
      }
      this.tweens.add({ targets: this.caption, alpha: 1, duration: 600 });
    });

    let ready = false;
    let firstLit = false;
    this.time.delayedCall(2300, () => (ready = true)); // keys only work once the button is showing
    const proceed = () => {
      if (!ready) return;
      // on the prologue, light the maha diya only when the button is pressed
      if (night === 0 && !firstLit) {
        firstLit = true;
        if (lit <= 5) {
          this.rig.addWick();
          Sfx.setLevel(NIGHT_LEVEL[night + 1] ?? 5);
        }
        this.tweens.add({ targets: this.caption, alpha: 1, duration: 600 });
        this.time.delayedCall(900, () => go(this, next));
        return;
      }
      go(this, next);
    };
    this.btn = button(this, 1070, 614, night === 0 ? 'Light the first night' : 'Continue', proceed, { w: 300, h: 64, size: 28 });
    this.btn.setAlpha(0);
    this.btn.input.enabled = false; // an invisible button must not be clickable
    this.tweens.add({ targets: this.btn, alpha: 1, duration: 500, delay: 2300, onComplete: () => (this.btn.input.enabled = true) });
    this.input.keyboard.on('keydown-SPACE', proceed);
    this.input.keyboard.on('keydown-ENTER', proceed);
  }

  /** The annakut for the Day 4 card: the same offerings you stack in the game, piled up with the maha-deep on top. */
  makeHill() {
    if (this.textures.exists('card_hill')) return;
    const SQ = { dung_pat: 0.5, thali_grain: 0.85, bowl_rice: 0.82, bowl_curd: 0.82, dry_fruit_plate: 0.85 };
    const CW = 340;
    const CH = 270;
    const ops = [];
    let up = 0;
    const layer = (key, w) => {
      const img = this.textures.get(key).getSourceImage();
      const h = img.height * (w / img.width) * (SQ[key] ?? 0.85);
      ops.push({ img, w, h, up });
      up += h * 0.62;
    };
    layer('dung_pat', 300);
    layer('dung_pat', 280);
    ['thali_grain', 'bowl_rice', 'bowl_curd', 'dry_fruit_plate', 'bowl_rice', 'thali_grain'].forEach((k, i) => layer(k, 220 - i * 22));
    const diya = this.textures.get('diya').getSourceImage();
    const dw = 64;
    const dh = (diya.height * dw) / diya.width;
    ops.push({ img: diya, w: dw, h: dh, up: up - 6 });
    const total = up + dh + 40;
    const k = Math.min(1, (CH - 12) / total);
    const tex = this.textures.createCanvas('card_hill', CW, CH);
    const ctx = tex.getContext();
    ctx.save();
    ctx.translate(CW / 2, CH - 6);
    ctx.scale(k, k);
    ops.forEach((o) => ctx.drawImage(o.img, -o.w / 2, -(o.up + o.h), o.w, o.h));
    drawFlame(ctx, 0, -(up - 6 + dh) + 10, 40);
    ctx.restore();
    tex.refresh();
  }

  update(time) {
    this.rig.update(time);
  }
}
