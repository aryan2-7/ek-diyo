import Phaser from 'phaser';
import { W, H, COLORS, CSS } from '../config.js';
import { NIGHTS } from '../data/nights.js';
import { completeNight } from '../state.js';
import { Lighting } from '../systems/Lighting.js';
import { DiyaRig } from '../systems/Flame.js';
import { Sfx } from '../systems/sfx.js';
import { text, titleText, banner, hintPill, tornPaper, go, fadeIn, paperGrain, globalKeys } from '../ui/ui.js';

// ---- tuning -------------------------------------------------------------
const GROUND = 655; // y of the street the dog runs on
const DOG_X = 330;
const GRAVITY = 2600;
const JUMP_V = -1000;
const BASE_SPEED = 400;
const MAX_SPEED = 520;
const TRACK = 36000; // distance (px) from start to the gate  (~80 s)
const NO_SPAWN_LAST = 2600; // stop spawning obstacles this far before the gate
// ---------------------------------------------------------------------------

const lerp = Phaser.Math.Linear;
const approach = (v, to, step) => (v < to ? Math.min(to, v + step) : Math.max(to, v - step));

const OBSTACLES = {
  pots: { key: 'obstacle_pots', h: 135, hitW: 46, hitH: 118 },
  baskets: { key: 'obstacle_baskets', h: 105, hitW: 80, hitH: 74 },
};

export default class Night2 extends Phaser.Scene {
  constructor() {
    super('Night2');
  }

  init() {
    this._leaving = false;
    this.phase = 'intro'; // intro -> run -> gate -> done
    this.dist = 0;
    this.speed = 0;
    this.garlands = 0;
    this.garlandsSeen = 0;
    this.stumbles = 0;
    this.stumble = 0;
    this.invuln = 0;
    this.nextSpawn = 700;
    this.obs = [];
    this.gar = [];
    this.gate = null;
    this.dogY = GROUND;
    this.vy = 0;
    this.onGround = true;
    this.jumpBuffer = 0;
    this.gallop = 0;
    this.ambBase = 0.12;
    this.t = 0;
  }

  create() {
    fadeIn(this);
    this.cameras.main.setBackgroundColor(CSS.soot);
    globalKeys(this);

    // two copies of the (already mirrored, seamless) street, scrolling
    this.bgA = this.add.image(0, 0, 'bg_n2').setOrigin(0).setDepth(0);
    const sc = H / this.bgA.height;
    this.bgA.setScale(sc);
    this.bgW = this.bgA.displayWidth;
    this.bgB = this.add.image(this.bgW, 0, 'bg_n2').setOrigin(0).setScale(sc).setDepth(0);

    this.light = new Lighting(this, { depth: 800, ambient: this.ambBase });
    paperGrain(this, 0.12);

    // the Keeper stays behind on the street
    this.keeper = this.add.image(250, GROUND + 14, 'keeper_side').setOrigin(0.5, 1).setDepth(GROUND + 20);
    this.keeper.setScale(285 / this.keeper.height);

    // the diya: starts in his hand, then floats ahead to light the road
    this.rig = new DiyaRig(this, 0, 0, { width: 88, wicks: 2, depth: 760 });
    this.handPos = {
      x: this.keeper.x + (0.97 - 0.5) * this.keeper.displayWidth,
      y: this.keeper.y - this.keeper.displayHeight * 0.5,
    };
    this.rig.setPosition(this.handPos.x, this.handPos.y);
    this.diyaLight = this.light.add({ x: this.handPos.x, y: this.handPos.y, radius: 300, flicker: 0.05 });

    // dog
    this.shadow = this.add.ellipse(DOG_X, GROUND + 4, 170, 18, COLORS.soot, 0.35).setDepth(GROUND - 1);
    this.dog = this.add.image(DOG_X, GROUND, 'dog_run').setOrigin(0.5, 1).setDepth(GROUND + 10);
    this.dogScale = 218 / this.dog.width;
    this.dog.setScale(this.dogScale);

    this.dust = this.add.particles(0, 0, 'ember', {
      lifespan: 450, speedX: { min: -90, max: 20 }, speedY: { min: -60, max: -10 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0xd9c9a0, emitting: false,
    }).setDepth(GROUND + 15);
    this.petals = this.add.particles(0, 0, 'petal', {
      lifespan: 2200, speedX: { min: -120, max: 120 }, speedY: { min: -260, max: -80 }, gravityY: 320,
      rotate: { min: 0, max: 360 }, scale: { start: 0.9, end: 0.6 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(830);

    // input: Space / Up / W / tap = jump
    const press = () => this.pressJump();
    const release = () => this.releaseJump();
    ['SPACE', 'UP', 'W'].forEach((k) => {
      this.input.keyboard.on(`keydown-${k}`, press);
      this.input.keyboard.on(`keyup-${k}`, release);
    });
    this.input.on('pointerdown', press);
    this.input.on('pointerup', release);

    this.buildHud();
    banner(this, { kicker: 'DAY 2  ·  NIGHT 2', title: NIGHTS[2].name, sub: NIGHTS[2].goal }, { hold: 2400 });
    this.hint = hintPill(this, 'Space, W or tap to jump  ·  hold for a higher leap', H - 44);

    // intro beat: the diya rises from the Keeper's hand and floats ahead
    this.time.delayedCall(1900, () => {
      Sfx.bark();
      Sfx.chime();
      const tw = { u: 0 };
      this.tweens.add({
        targets: tw, u: 1, duration: 1300, ease: 'Cubic.easeInOut',
        onUpdate: () => {
          const x = lerp(this.handPos.x, DOG_X + 175, tw.u);
          const y = lerp(this.handPos.y, 390, tw.u) - Math.sin(tw.u * Math.PI) * 90;
          this.rig.setPosition(x, y);
        },
        onComplete: () => {
          this.phase = 'run';
          this.floating = true;
          this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 600 }));
        },
      });
      this.tweens.add({ targets: this.diyaLight, radius: 520, duration: 1300 });
      this.tweens.addCounter({ from: 0.12, to: 0.62, duration: 1800, onUpdate: (t) => (this.ambBase = t.getValue()) });
    });
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const g = this.add.graphics().setDepth(900);
    tornPaper(g, 18, 16, 176, 58, { seed: 4, amp: 2 });
    const icon = this.add.image(62, 46, 'marigold_mala').setDepth(905);
    icon.setScale(66 / icon.width);
    this.garText = text(this, 150, 46, '0', { size: 34, color: CSS.indigo, bold: true, shadow: false, depth: 906 });
    // progress to the gate
    const bw = 470;
    this.trackX = W / 2 - bw / 2 + 36;
    this.trackW = bw - 72;
    tornPaper(g, W / 2 - bw / 2, 16, bw, 58, { seed: 6, amp: 2 });
    g.fillStyle(COLORS.indigo, 0.35).fillRect(this.trackX, 43, this.trackW, 6);
    g.fillStyle(COLORS.marigold, 1).fillRect(this.trackX, 43, 4, 6);
    this.gateIcon = this.add.image(this.trackX + this.trackW + 4, 56, 'gate').setOrigin(0.5, 1).setDepth(905).setScale(0.1);
    this.dogIcon = this.add.image(this.trackX, 50, 'dog_run').setOrigin(0.5, 1).setDepth(906).setScale(0.07);
  }

  // ---------------------------------------------------------------- jump
  pressJump() {
    this.jumpBuffer = 0.12;
  }

  releaseJump() {
    if (!this.onGround && this.vy < -350) this.vy *= 0.5;
  }

  doJump() {
    this.vy = JUMP_V;
    this.onGround = false;
    this.jumpBuffer = 0;
    Sfx.jump();
  }

  // ---------------------------------------------------------------- spawning
  spawnPattern() {
    const x = W + 150;
    const r = Math.random();
    const place = (type, px) => {
      const def = OBSTACLES[type];
      const spr = this.add.image(px, GROUND + 6, def.key).setOrigin(0.5, 1).setDepth(GROUND + 5);
      spr.setScale(def.h / spr.height);
      this.obs.push({ spr, def, x: px });
    };
    const arc = (cx) => {
      [-130, 0, 130].forEach((dx, i) => this.addGarland(cx + dx, GROUND - (i === 1 ? 205 : 172)));
    };
    let extra = 0;
    if (r < 0.4) {
      place('pots', x);
      arc(x);
    } else if (r < 0.7) {
      place('baskets', x);
      arc(x);
    } else {
      place('pots', x);
      place('baskets', x + 540);
      arc(x);
      arc(x + 540);
      extra = 540;
    }
    // sometimes a ground-level garland in the gap
    if (Math.random() < 0.5) this.addGarland(x + 300 + extra, GROUND - 98);
    this.nextSpawn = this.dist + extra + Phaser.Math.Between(560, 860);
  }

  addGarland(x, y) {
    const spr = this.add.image(x, y, 'marigold_mala').setDepth(GROUND + 8);
    spr.setScale(124 / spr.width);
    this.gar.push({ spr, x, y, taken: false, bob: Math.random() * 6 });
    this.garlandsSeen++;
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;

    // speed control
    if (this.phase === 'run' || this.phase === 'gate') {
      let target = lerp(BASE_SPEED, MAX_SPEED, Math.min(1, this.dist / TRACK));
      if (this.stumble > 0) target *= 0.5;
      if (this.gate) {
        const left = this.gate.x - (DOG_X + 240);
        target = Math.min(target, Math.max(0, left * 1.6));
        if (left < 6 && this.speed < 14) {
          this.speed = 0;
          this.finish();
        }
      }
      this.speed = approach(this.speed, target, 520 * dt);
    }
    this.stumble = Math.max(0, this.stumble - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    const move = this.speed * dt;
    this.dist += move;
    if (this.phase === 'run' || this.phase === 'gate') this.scroll(move, dt);

    // spawn
    if (this.phase === 'run' && this.dist >= this.nextSpawn && this.dist < TRACK - NO_SPAWN_LAST) this.spawnPattern();
    if (this.phase === 'run' && !this.gate && this.dist >= TRACK - 1700) {
      this.gate = this.add.image(W + 260, GROUND + 10, 'gate').setOrigin(0.5, 1).setDepth(GROUND - 2);
      this.gate.setScale(0.92);
      this.phase = 'gate';
    }

    this.updateDog(time, dt);
    this.updateDiya(time);

    // light & darkness
    this.light.ambient = this.ambBase;
    this.light.update(time);

    // HUD
    const k = Math.min(1, this.dist / TRACK);
    this.dogIcon.x = this.trackX + this.trackW * k;
    this.garText.setText(String(this.garlands));
  }

  scroll(move, dt) {
    const off = this.dist % this.bgW;
    this.bgA.x = -off;
    this.bgB.x = -off + this.bgW;
    // keeper & gate are part of the street
    this.keeper.x -= move;
    this.keeper.setVisible(this.keeper.x > -200);
    if (this.gate) this.gate.x -= move;

    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      o.x -= move;
      o.spr.x = o.x;
      if (o.x < -200) {
        o.spr.destroy();
        this.obs.splice(i, 1);
      }
    }
    for (let i = this.gar.length - 1; i >= 0; i--) {
      const g = this.gar[i];
      g.x -= move;
      g.spr.setPosition(g.x, g.y + Math.sin(this.t * 3 + g.bob) * 4);
      g.spr.setRotation(Math.sin(this.t * 2 + g.bob) * 0.05);
      if (g.x < -200) {
        g.spr.destroy();
        this.gar.splice(i, 1);
      }
    }
  }

  updateDog(time, dt) {
    const run = this.phase === 'run' || this.phase === 'gate';
    // jump + gravity
    if (run && this.jumpBuffer > 0 && this.onGround && this.stumble < 0.55) this.doJump();
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.dogY += this.vy * dt;
      if (this.dogY >= GROUND) {
        this.dogY = GROUND;
        this.vy = 0;
        this.onGround = true;
        Sfx.land();
        this.dust.explode(6, DOG_X - 30, GROUND);
        this.dog.setScale(this.dogScale * 1.08, this.dogScale * 0.88);
        this.tweens.add({ targets: this.dog, scaleX: this.dogScale, scaleY: this.dogScale, duration: 180, ease: 'Back.easeOut' });
      }
    }

    // pose
    if (this.phase === 'done') return;
    if (!this.onGround) {
      this.dog.setTexture('dog_jump');
      this.dog.setRotation(Phaser.Math.Clamp(this.vy / 4200, -0.22, 0.18));
    } else {
      this.gallop += dt * (4 + this.speed / 60);
      const frame = this.speed > 30 ? Math.floor(this.gallop) % 2 : 0;
      this.dog.setTexture(frame ? 'dog_jump' : 'dog_run');
      this.dog.setRotation(this.speed > 30 ? Math.sin(this.gallop * Math.PI) * 0.03 : 0);
    }
    const bob = this.onGround && this.speed > 30 ? Math.abs(Math.sin(this.gallop * Math.PI)) * -6 : 0;
    this.dog.setPosition(DOG_X, this.dogY + bob);
    const h = (GROUND - this.dogY) / 200;
    this.shadow.setPosition(DOG_X - 6, GROUND + 4).setScale(1 - Math.min(0.5, h * 0.4), 1).setAlpha(0.35 - Math.min(0.2, h * 0.2));
    this.dog.setAlpha(this.invuln > 0 ? (Math.floor(time / 70) % 2 ? 0.45 : 1) : 1);

    if (!run) return;

    // collisions
    const dl = DOG_X - 40;
    const dr = DOG_X + 50;
    const dt_ = this.dogY - 102;
    const db = this.dogY - 8;
    if (this.invuln <= 0) {
      for (let i = 0; i < this.obs.length; i++) {
        const o = this.obs[i];
        const ol = o.x - o.def.hitW / 2;
        const or = o.x + o.def.hitW / 2;
        const ot = GROUND - o.def.hitH;
        if (dr > ol && dl < or && db > ot && dt_ < GROUND) {
          this.hit(o, i);
          break;
        }
      }
    }
    // garlands
    for (const g of this.gar) {
      if (g.taken) continue;
      if (Math.hypot(g.x - (DOG_X + 8), g.y - (this.dogY - 78)) < 92) {
        g.taken = true;
        this.garlands++;
        Sfx.collect();
        this.tweens.add({
          targets: g.spr, x: 62, y: 46, scale: 0.05, alpha: 0.2, duration: 450, ease: 'Cubic.easeIn',
          onComplete: () => {
            const i = this.gar.indexOf(g);
            if (i >= 0) this.gar.splice(i, 1);
            g.spr.destroy();
          },
        });
        this.petals.explode(5, g.x, g.y);
      }
    }
  }

  hit(o, i) {
    this.stumbles++;
    this.stumble = 0.9;
    this.invuln = 1.5;
    Sfx.hit();
    Sfx.yelp();
    this.cameras.main.shake(140, 0.005);
    this.obs.splice(i, 1);
    this.tweens.add({
      targets: o.spr, y: o.spr.y - 70, angle: 55, alpha: 0, duration: 480, ease: 'Quad.easeOut',
      onComplete: () => o.spr.destroy(),
    });
  }

  updateDiya(time) {
    if (this.floating) {
      const bobY = Math.sin(this.t * 2.2) * 9;
      const x = DOG_X + 175 + Math.sin(this.t * 1.3) * 6;
      this.rig.setPosition(x, 390 + bobY);
    }
    this.rig.update(time);
    const lp = this.rig.lightPoint();
    this.diyaLight.x = lp.x;
    this.diyaLight.y = lp.y;
  }

  // ---------------------------------------------------------------- the gate
  finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    Sfx.fanfare();
    Sfx.bark();
    this.dog.setVisible(false);
    this.shadow.setVisible(false);
    const sit = this.add.image(DOG_X + 20, GROUND + 6, 'dog_tika').setOrigin(0.5, 1).setDepth(GROUND + 20);
    const target = 250 / sit.height;
    sit.setScale(0);
    this.tweens.add({ targets: sit, scale: target, duration: 700, ease: 'Back.easeOut' });
    this.petals.explode(40, DOG_X + 20, GROUND - 160);
    this.tweens.addCounter({ from: this.ambBase, to: 0.3, duration: 1800, onUpdate: (t) => (this.ambBase = t.getValue()) });
    const t = titleText(this, W / 2, 250, 'The gate is safe.', { size: 64, color: CSS.cream, depth: 950 }).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 236, duration: 900, delay: 500 });
    this.time.delayedCall(4200, () => {
      completeNight(2, { garlands: this.garlands });
      go(this, 'StoryCard', {
        night: 2,
        card: { ...NIGHTS[2].card, bg: NIGHTS[2].bg },
        stats: [
          { label: 'Marigold garlands', value: `${this.garlands}/${this.garlandsSeen}` },
          { label: 'Stumbles', value: String(this.stumbles) },
        ],
        next: NIGHTS[2].next,
        wicksBefore: 2,
      });
    });
  }
}
