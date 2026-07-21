import Phaser from 'phaser';
import { LEVELS, LevelConfig, endlessTune, DAILY_CFG } from '../config/levels';
import { Fruit, FruitSize, SpecialKind } from '../objects/Fruit';
import { FRUITS, SPECIALS, GLOW_KEY, PARTICLE_KEY } from '../core/TextureFactory';
import { InputManager, SwipePoint } from '../core/InputManager';
import { Audio } from '../core/AudioManager';
import { Save } from '../core/SaveManager';
import { trailColors } from '../core/Skins';
import { Palette, Fonts, hex, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { drawBackground } from '../core/Ui';

const COMBO_WINDOW = 1500; // ms to keep a streak alive
const MISS_PENALTY = 20;

export type GameMode = 'campaign' | 'endless' | 'daily';
interface GameData { level?: number; retries?: number; mode?: GameMode }

// Deterministic RNG for the daily challenge: same date → same spawn sequence.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export class GameScene extends Phaser.Scene {
  private cfg!: LevelConfig;
  private mode: GameMode = 'campaign';
  private retries = 0;
  private rand: () => number = Math.random;

  private fruits: Fruit[] = [];
  private inputMgr!: InputManager;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private trailPoints: SwipePoint[] = [];

  private score = 0;
  private lives = 3;
  private timeLeft = 0;
  private elapsed = 0;
  private timeToTarget = 0;   // seconds when target was first reached
  private streak = 0;
  private lastSliceAt = -1e9;
  private spawnAcc = 0;
  private stormAcc = 0;
  private wind = 0;
  private windDir = 1;
  private windAcc = 0;
  private running = false;
  private nearMissAt = -1e9;

  // Special-fruit state
  private slowUntil = -1e9;    // rainbow slow-motion window (real time)
  private timeScale = 1;
  private slowVeil!: Phaser.GameObjects.Rectangle;

  // Frenzy power-up state
  private frenzyArmed = true;      // re-arms when the streak resets
  private doubleUntil = -1e9;      // ×2 points window (real time)

  /** Rotating laser barriers: the blade stops where it touches one. */
  private barriers: { cx: number; cy: number; len: number; angle: number; speed: number }[] = [];
  private barrierGfx!: Phaser.GameObjects.Graphics;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private multText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private heartIcons: Phaser.GameObjects.Text[] = [];
  private progressFill!: Phaser.GameObjects.Rectangle;
  private windArrow!: Phaser.GameObjects.Text;

  constructor() { super('Game'); }

  init(data: GameData) {
    this.mode = data.mode ?? 'campaign';
    this.cfg = this.mode === 'endless' ? endlessTune(0)
      : this.mode === 'daily' ? DAILY_CFG
      : LEVELS[(data.level ?? 1) - 1];
    this.rand = this.mode === 'daily'
      ? mulberry32(hashStr('nfc-' + new Date().toISOString().slice(0, 10)))
      : Math.random;
    this.retries = data.retries ?? 0;
    this.fruits = [];
    this.heartIcons = [];
    this.score = 0;
    this.lives = 3;
    this.timeLeft = this.cfg.timeLimit;
    this.elapsed = 0;
    this.timeToTarget = 0;
    this.streak = 0;
    this.lastSliceAt = -1e9;
    this.spawnAcc = 900; // first fruit arrives quickly
    this.stormAcc = 0;
    this.windDir = 1;
    this.windAcc = 0;
    this.wind = 0;
    this.running = false;
    this.slowUntil = -1e9;
    this.timeScale = 1;
    this.frenzyArmed = true;
    this.doubleUntil = -1e9;
  }

  create() {
    drawBackground(this);
    this.cameras.main.fadeIn(200, 18, 8, 31);
    this.buildHud();
    this.barrierGfx = this.add.graphics().setDepth(30);
    this.trailGfx = this.add.graphics().setDepth(50);
    this.slowVeil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2ee6ff, 0)
      .setDepth(35);

    this.rebuildBarriers();

    this.inputMgr = new InputManager(this, {
      onSwipeMove: pts => { this.trailPoints = pts; this.sliceWithSwipe(pts); },
      onSwipeEnd: () => { this.trailPoints = []; },
      onPause: () => this.pauseGame(),
      onRestart: () => this.quickRestart(),
      onMute: () => Audio.toggleMute(),
    });

    const introTitle = this.mode === 'endless' ? 'ENDLESS\nSURVIVE!'
      : this.mode === 'daily' ? 'DAILY CHALLENGE\n60 SECONDS'
      : `LEVEL ${this.cfg.id}\n${this.cfg.name.toUpperCase()}`;
    const intro = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, introTitle, {
      fontFamily: Fonts.display, fontSize: '52px', color: hex(Palette.white),
      align: 'center', stroke: hex(Palette.primary), strokeThickness: 8,
    }).setOrigin(0.5).setDepth(100).setScale(0.4).setAlpha(0);

    this.tweens.add({
      targets: intro, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: intro, alpha: 0, scale: 1.3, delay: 550, duration: 260,
        onComplete: () => {
          intro.destroy();
          // The text overlay is a safety net for players who skipped the
          // interactive tutorial; anyone who finished it starts clean.
          if (this.mode === 'campaign' && this.cfg.id === 1 && this.retries === 0 && !Save.tutorialSeen) this.showTutorial();
          else this.running = true;
        },
      }),
    });
  }

  private rebuildBarriers() {
    // Spread barriers evenly across the mid-band; alternate spin direction.
    this.barriers = [];
    for (let i = 0; i < this.cfg.barriers; i++) {
      this.barriers.push({
        cx: GAME_WIDTH * ((i + 1) / (this.cfg.barriers + 1)),
        cy: GAME_HEIGHT * (0.38 + 0.14 * (i % 2)),
        len: 170,
        angle: Phaser.Math.FloatBetween(0, Math.PI),
        speed: (i % 2 ? -1 : 1) * 0.55,
      });
    }
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const hudStyle = { fontFamily: Fonts.body, fontSize: '17px', color: hex(Palette.textDim) };
    const modeName = this.mode === 'endless' ? 'ENDLESS'
      : this.mode === 'daily' ? `DAILY · ${new Date().toISOString().slice(0, 10)}`
      : `LV ${this.cfg.id} · ${this.cfg.name}`;

    this.add.text(20, 14, modeName, hudStyle).setDepth(60);
    for (let i = 0; i < 3; i++) {
      this.heartIcons.push(
        this.add.text(20 + i * 30, 38, '♥', {
          fontFamily: Fonts.body, fontSize: '26px', color: hex(Palette.primary),
        }).setDepth(60),
      );
    }

    this.scoreText = this.add.text(GAME_WIDTH / 2, 16, '0', {
      fontFamily: Fonts.display, fontSize: '36px', color: hex(Palette.white),
    }).setOrigin(0.5, 0).setDepth(60).setShadow(0, 0, hex(Palette.secondary), 12, true, true);

    this.multText = this.add.text(GAME_WIDTH / 2, 58, '', {
      fontFamily: Fonts.display, fontSize: '20px', color: hex(Palette.accent),
    }).setOrigin(0.5, 0).setDepth(60);

    this.timerText = this.add.text(GAME_WIDTH - 20, 14, '', {
      fontFamily: Fonts.display, fontSize: '30px', color: hex(Palette.secondary),
    }).setOrigin(1, 0).setDepth(60);

    // Progress bar: toward target (campaign) or toward the record (other modes).
    this.add.rectangle(GAME_WIDTH - 20, 56, 180, 10, 0x000000, 0.5)
      .setOrigin(1, 0).setStrokeStyle(2, Palette.secondary, 0.8).setDepth(60);
    this.progressFill = this.add.rectangle(GAME_WIDTH - 198, 58, 1, 6, Palette.good)
      .setOrigin(0, 0).setDepth(61);
    const barLabel = this.mode === 'campaign'
      ? `TARGET ${this.cfg.targetScore} · PAR ${this.cfg.parScore}`
      : `BEST ${this.bestForMode()}`;
    this.add.text(GAME_WIDTH - 20, 72, barLabel, {
      fontFamily: Fonts.body, fontSize: '13px', color: hex(Palette.textDim),
    }).setOrigin(1, 0).setDepth(60);

    this.windArrow = this.add.text(GAME_WIDTH - 20, 96, '', {
      fontFamily: Fonts.body, fontSize: '15px', color: hex(Palette.textDim),
    }).setOrigin(1, 0).setDepth(60);

    // On-screen pause button (mobile has no Esc).
    const pauseBtn = this.add.text(GAME_WIDTH - 26, GAME_HEIGHT - 26, '⏸', {
      fontFamily: Fonts.body, fontSize: '30px', color: hex(Palette.textDim),
    }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.pauseGame());
  }

  private bestForMode(): number {
    return this.mode === 'endless' ? Save.endlessBest : Save.dailyBest();
  }

  private updateHud() {
    this.scoreText.setText(`${this.score}`);
    const mult = this.multiplier;
    const frenzy = this.time.now < this.doubleUntil ? '  ×2 FRENZY!' : '';
    this.multText.setText((mult > 1 ? `x${mult} STREAK ${this.streak}` : '') + frenzy);
    if (this.mode === 'endless') {
      this.timerText.setText(`${Math.floor(this.elapsed)}s`).setColor(hex(Palette.secondary));
    } else {
      this.timerText.setText(`${Math.ceil(this.timeLeft)}s`);
      this.timerText.setColor(this.timeLeft < 10 ? hex(Palette.danger) : hex(Palette.secondary));
    }
    const denom = this.mode === 'campaign' ? this.cfg.targetScore : Math.max(this.bestForMode(), 1);
    const frac = Phaser.Math.Clamp(this.score / denom, 0, 1);
    this.progressFill.width = 176 * frac;
    this.progressFill.fillColor =
      this.mode === 'campaign'
        ? (this.score >= this.cfg.parScore ? Palette.accent : Palette.good)
        : (this.score > this.bestForMode() ? Palette.accent : Palette.good);
    this.heartIcons.forEach((h, i) => h.setAlpha(i < this.lives ? 1 : 0.15));
    if (this.cfg.wind > 0) {
      this.windArrow.setText(`WIND ${this.windDir > 0 ? '→' : '←'}`);
    }
  }

  private get multiplier() { return Math.min(1 + Math.floor(this.streak / 4), 5); }

  // ---------------------------------------------------------------- Tutorial fallback

  private showTutorial() {
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68).setDepth(200);
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(201);
    const lines = [
      'HOW TO PLAY',
      '',
      'Drag across fruit to slice it — through the',
      'center for a CRITICAL (double points).',
      '',
      'Chain slices within 1.5s to build a streak — every',
      '4 streak raises your multiplier (up to x5).',
      '',
      'Avoid bombs (–1 life). Steel spike orbs break',
      'your streak (–30) but cost no life. From level 4,',
      'cyan laser bars BLOCK your blade — cut around them.',
      '',
      'Reach the target score before time runs out.',
      'Beat PAR for 3 stars. Fruit bounces off the ceiling.',
    ];
    panel.add(this.add.rectangle(0, 0, 620, 440, 0x1a0b2e, 0.95).setStrokeStyle(3, Palette.secondary));
    panel.add(this.add.text(0, -25, lines.join('\n'), {
      fontFamily: Fonts.body, fontSize: '18px', color: hex(Palette.white), align: 'center', lineSpacing: 4,
    }).setOrigin(0.5));
    const skip = this.add.text(0, 185, '[ CLICK OR PRESS ANY KEY TO START ]', {
      fontFamily: Fonts.display, fontSize: '18px', color: hex(Palette.accent),
    }).setOrigin(0.5);
    panel.add(skip);
    this.tweens.add({ targets: skip, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    const dismiss = () => {
      this.input.off('pointerdown', dismiss);
      this.input.keyboard?.off('keydown', dismiss);
      this.tweens.add({
        targets: [veil, panel], alpha: 0, duration: 200,
        onComplete: () => { veil.destroy(); panel.destroy(); this.running = true; },
      });
    };
    // Defer so the click that opened the level doesn't also dismiss.
    this.time.delayedCall(250, () => {
      this.input.on('pointerdown', dismiss);
      this.input.keyboard?.on('keydown', dismiss);
    });
  }

  // ---------------------------------------------------------------- Spawning

  private randBetween(min: number, max: number) { return min + this.rand() * (max - min); }
  private randInt(min: number, max: number) { return Math.floor(this.randBetween(min, max + 1)); }

  private spawnBurst(count: number) {
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 110, () => this.spawnOne());
    }
  }

  private spawnOne() {
    if (!this.running) return;
    const roll = this.rand();
    const variant = roll < this.cfg.bombChance ? 'bomb'
      : roll < this.cfg.bombChance + this.cfg.spikeChance ? 'spike'
      : 'fruit';
    const x = this.randInt(100, GAME_WIDTH - 100);
    // Aim launch velocity roughly toward mid-screen so arcs stay playable.
    let vx = this.randBetween(-1, 1) * 120 + (GAME_WIDTH / 2 - x) * 0.25;
    let vy = -this.randBetween(620, 780) * this.cfg.speedMul;

    let fruit: Fruit;
    if (variant === 'fruit') {
      const special = this.rollSpecial();
      if (special === 'golden') {
        vx *= 1.25; vy *= 1.2;
        fruit = new Fruit(this, x, GAME_HEIGHT + 60, SPECIALS.golden, 'small', vx, vy);
      } else if (special === 'frozen') {
        vy *= 0.9;
        fruit = new Fruit(this, x, GAME_HEIGHT + 60, SPECIALS.frozen, 'big', vx, vy);
      } else if (special === 'rainbow') {
        fruit = new Fruit(this, x, GAME_HEIGHT + 60, SPECIALS.rainbow, 'medium', vx, vy);
      } else {
        const kind = FRUITS[Math.floor(this.rand() * FRUITS.length)];
        fruit = new Fruit(this, x, GAME_HEIGHT + 60, kind, this.rollSize(), vx, vy);
      }
      fruit.special = special;
    } else {
      fruit = new Fruit(this, x, GAME_HEIGHT + 60, null, 'medium', vx, vy, variant);
    }
    this.fruits.push(fruit);
  }

  /** Specials unlock progressively in the campaign; always active elsewhere. */
  private rollSpecial(): SpecialKind {
    const lvl = this.mode === 'campaign' ? this.cfg.id : 99;
    const r = this.rand();
    if (lvl >= 2 && r < 0.04) return 'golden';
    if (lvl >= 3 && r < 0.10) return 'frozen';
    if (lvl >= 5 && r < 0.13) return 'rainbow';
    return null;
  }

  private rollSize(): FruitSize {
    const [s, m, b] = this.cfg.sizeWeights;
    const r = this.rand() * (s + m + b);
    return r < s ? 'small' : r < s + m ? 'medium' : 'big';
  }

  /** Streak reward: a frenzy orb worth slicing. */
  private spawnPowerOrb() {
    const x = this.randInt(GAME_WIDTH / 2 - 150, GAME_WIDTH / 2 + 150);
    const orb = new Fruit(this, x, GAME_HEIGHT + 60, null, 'medium',
      (GAME_WIDTH / 2 - x) * 0.3, -640, 'power');
    this.fruits.push(orb);
    this.popup(GAME_WIDTH / 2, 190, 'FRENZY ORB!', Palette.primary, 30);
    Audio.combo(8);
  }

  // ---------------------------------------------------------------- Slicing

  private sliceWithSwipe(pts: SwipePoint[]) {
    if (!this.running || pts.length < 2) return;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    // Ignore micro-movements so resting the pointer on a fruit doesn't cut it.
    if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < 6) return;
    this.sliceSegment(a.x, a.y, b.x, b.y);
  }

  /** Clip a slice segment at the nearest barrier crossing. Returns the cut end. */
  private clipAtBarriers(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; blocked: boolean } {
    const seg = new Phaser.Geom.Line(x1, y1, x2, y2);
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const b of this.barriers) {
      const bl = new Phaser.Geom.Line(
        b.cx - Math.cos(b.angle) * b.len / 2, b.cy - Math.sin(b.angle) * b.len / 2,
        b.cx + Math.cos(b.angle) * b.len / 2, b.cy + Math.sin(b.angle) * b.len / 2,
      );
      const out = new Phaser.Geom.Point();
      if (Phaser.Geom.Intersects.LineToLine(seg, bl, out)) {
        const d = Phaser.Math.Distance.Between(x1, y1, out.x, out.y);
        if (d < bestD) { bestD = d; best = { x: out.x, y: out.y }; }
      }
    }
    return best ? { ...best, blocked: true } : { x: x2, y: y2, blocked: false };
  }

  private sliceSegment(x1: number, y1: number, x2: number, y2: number) {
    // The blade dies where it meets a laser barrier.
    const clip = this.clipAtBarriers(x1, y1, x2, y2);
    if (clip.blocked) {
      if (this.time.now - this.nearMissAt > 250) {
        this.nearMissAt = this.time.now;
        Audio.fizzle();
        const spark = this.add.image(clip.x, clip.y, GLOW_KEY).setTint(Palette.secondary).setScale(1.4).setDepth(45);
        this.tweens.add({ targets: spark, alpha: 0, scale: 2.2, duration: 200, onComplete: () => spark.destroy() });
      }
      x2 = clip.x; y2 = clip.y;
    }

    const angle = Math.atan2(y2 - y1, x2 - x1);
    let cut = 0;

    for (const f of [...this.fruits]) {
      if (f.sliced) continue;
      const d = f.distToSegment(x1, y1, x2, y2);

      if (d <= f.radius) {
        if (f.isBomb) { this.hitBomb(f); continue; }
        if (f.isSpike) { this.hitSpike(f); continue; }
        if (f.isPower) { this.hitPower(f); continue; }
        if (f.special === 'frozen' && !f.cracked) { this.crackFrozen(f); continue; }
        const critical = d <= f.radius * 0.3;
        this.sliceFruit(f, angle, critical);
        cut++;
      } else if (f.isBomb && d <= f.radius * 1.9 && this.time.now - this.nearMissAt > 900) {
        // Near-miss on a bomb: reward the dodge with feedback.
        this.nearMissAt = this.time.now;
        this.popup(f.x, f.y - 50, 'CLOSE!', Palette.danger, 20);
      }
    }

    if (cut >= 2) {
      const bonus = cut * 15;
      this.score += bonus;
      Audio.combo(cut);
      this.popup(x2, y2 - 40, `${cut}-FRUIT COMBO +${bonus}`, Palette.accent, 26);
    }
  }

  private sliceFruit(f: Fruit, angle: number, critical: boolean) {
    f.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, f);

    // Streak bookkeeping.
    const now = this.time.now;
    this.streak = now - this.lastSliceAt <= COMBO_WINDOW ? this.streak + 1 : 1;
    this.lastSliceAt = now;

    // Specials score flat (their size already encodes risk); normal fruit
    // scale by size. Everything multiplies by crit, streak, and frenzy.
    const base = f.special
      ? (f.special === 'golden' ? SPECIALS.golden.points
        : f.special === 'frozen' ? SPECIALS.frozen.points
        : SPECIALS.rainbow.points)
      : Math.round((f.kind?.points ?? 0) * f.pointMultiplier);
    let pts = base * (critical ? 2 : 1) * this.multiplier;
    if (now < this.doubleUntil) pts *= 2;
    this.score += pts;
    if (this.mode === 'campaign' && this.timeToTarget === 0 && this.score >= this.cfg.targetScore) {
      this.timeToTarget = this.elapsed;
    }

    Audio.slice(this.streak);
    if (critical) Audio.critical();

    // Juice: halves, splatter particles, glow flash, score popup.
    f.spawnHalves(angle);
    const color = f.kind!.color;
    this.burstParticles(f.x, f.y, {
      speed: { min: 80, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      lifespan: { min: 300, max: 650 },
      gravityY: 500,
      tint: f.special === 'rainbow' ? [0xff2e97, 0xffe14d, 0x53ff9a, 0x2ee6ff] : color,
    }, critical || f.special ? 26 : 14);

    const flash = this.add.image(f.x, f.y, GLOW_KEY).setTint(color).setScale(critical ? 4 : 2.4).setDepth(40);
    this.tweens.add({ targets: flash, alpha: 0, scale: flash.scale * 1.6, duration: 240, onComplete: () => flash.destroy() });

    const tag = f.special === 'golden' ? `GOLDEN +${pts}!`
      : f.special === 'rainbow' ? `+${pts} SLOW-MO!`
      : critical ? `CRIT +${pts}` : `+${pts}`;
    this.popup(f.x, f.y - 30, tag,
      f.special === 'golden' ? Palette.accent : f.special === 'rainbow' ? Palette.secondary
        : critical ? Palette.accent : Palette.white,
      f.special || critical ? 28 : 20);

    // Rainbow: slow the world for a beat.
    if (f.special === 'rainbow') {
      this.slowUntil = now + 2500;
      Audio.combo(2);
      this.tweens.add({ targets: this.slowVeil, fillAlpha: 0.08, duration: 150, yoyo: false });
    }

    if (this.streak > 0 && this.streak % 4 === 0) {
      Audio.combo(this.streak);
      this.popup(GAME_WIDTH / 2, 150, `x${this.multiplier} MULTIPLIER!`, Palette.accent, 34);
      this.cameras.main.zoomTo(1.02, 90, 'Sine.easeInOut', true, (_c, p) => {
        if (p === 1) this.cameras.main.zoomTo(1, 120);
      });
      // Max multiplier earns a frenzy orb (once per streak build).
      if (this.multiplier === 5 && this.frenzyArmed) {
        this.frenzyArmed = false;
        this.time.delayedCall(300, () => { if (this.running) this.spawnPowerOrb(); });
      }
    }

    if (critical) this.cameras.main.shake(90, 0.004);
    f.destroy();
  }

  /** Frozen fruit: first hit cracks the ice, second hit scores. */
  private crackFrozen(f: Fruit) {
    f.cracked = true;
    f.setTexture('fruit-frozen-cracked');
    Audio.crack();
    this.burstParticles(f.x, f.y, {
      speed: { min: 60, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: { min: 200, max: 400 },
      tint: [0xe8f9ff, 0x9adfff],
    }, 10);
    this.popup(f.x, f.y - 34, 'CRACKED! HIT AGAIN!', Palette.secondary, 20);
  }

  private hitPower(orb: Fruit) {
    orb.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, orb);
    const mega = this.rand() < 0.5;
    this.cameras.main.flash(200, 255, 46, 151);
    this.burstParticles(orb.x, orb.y, {
      speed: { min: 120, max: 400 },
      scale: { start: 1.6, end: 0 },
      lifespan: { min: 300, max: 700 },
      tint: [Palette.primary, 0xffffff],
    }, 30);
    orb.destroy();

    if (mega) {
      this.popup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'MEGA SLICE!', Palette.primary, 44);
      Audio.win();
      this.cameras.main.shake(250, 0.008);
      // Cut every fruit on screen (bombs and spikes stay untouched).
      const targets = this.fruits.filter(f => f.variant === 'fruit' && !f.sliced);
      targets.forEach((f, i) => this.time.delayedCall(i * 45, () => {
        if (!f.sliced && f.active) this.sliceFruit(f, this.rand() * Math.PI, false);
      }));
    } else {
      this.doubleUntil = this.time.now + 6000;
      this.popup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '×2 POINTS — 6 SECONDS!', Palette.accent, 36);
      Audio.combo(6);
    }
  }

  private hitBomb(bomb: Fruit) {
    bomb.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, bomb);
    this.lives--;
    this.streak = 0;
    this.frenzyArmed = true;
    Audio.bomb();

    this.cameras.main.shake(320, 0.02);
    this.cameras.main.flash(220, 255, 59, 59);
    this.burstParticles(bomb.x, bomb.y, {
      speed: { min: 150, max: 480 },
      scale: { start: 2, end: 0 },
      lifespan: { min: 350, max: 800 },
      tint: [0xff3b3b, 0xff8c2e, 0xffe14d],
    }, 40);
    this.popup(bomb.x, bomb.y - 40, 'BOOM! -1 ♥', Palette.danger, 30);
    bomb.destroy();

    if (this.lives <= 0) this.endLevel(false);
  }

  private hitSpike(spike: Fruit) {
    spike.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, spike);
    const hadStreak = this.streak >= 4;
    this.streak = 0;
    this.frenzyArmed = true;
    this.score = Math.max(0, this.score - 30);
    Audio.clang();

    this.cameras.main.shake(140, 0.008);
    this.burstParticles(spike.x, spike.y, {
      speed: { min: 100, max: 300 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 200, max: 450 },
      tint: [0xaab4c8, 0xffffff],
    }, 18);
    // Extra sting when a real streak dies — the popup says why.
    this.popup(spike.x, spike.y - 40, hadStreak ? 'CLANG! STREAK LOST -30' : 'CLANG! -30', 0xd7dee9, hadStreak ? 26 : 22);
    spike.destroy();
  }

  private missFruit(f: Fruit) {
    if (!f.kind) return; // bombs, spikes, and power orbs are safe to let fall
    this.score = Math.max(0, this.score - MISS_PENALTY);
    this.streak = 0;
    this.frenzyArmed = true;
    Audio.miss();
    // Red flicker at the point of exit, so the player learns where they leak.
    const marker = this.add.image(f.x, GAME_HEIGHT - 14, GLOW_KEY).setTint(Palette.danger).setScale(2).setDepth(40);
    this.tweens.add({ targets: marker, alpha: 0, duration: 400, onComplete: () => marker.destroy() });
    this.popup(f.x, GAME_HEIGHT - 60, `-${MISS_PENALTY}`, Palette.danger, 20);
  }

  /** One-shot particle burst that cleans up its emitter afterwards. */
  private burstParticles(x: number, y: number, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, count: number) {
    const em = this.add.particles(x, y, PARTICLE_KEY, { ...config, emitting: false });
    em.explode(count, x, y);
    this.time.delayedCall(1200, () => em.destroy());
  }

  private popup(x: number, y: number, text: string, color: number, size: number) {
    const t = this.add.text(x, y, text, {
      fontFamily: Fonts.display, fontSize: `${size}px`, color: hex(color),
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(70).setScale(0.5);
    this.tweens.add({
      targets: t, scale: 1, y: y - 46, duration: 550, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => t.destroy() }),
    });
  }

  // ---------------------------------------------------------------- Flow

  private pauseGame() {
    if (!this.running) return;
    this.scene.pause();
    this.scene.launch('Pause', { level: this.cfg.id, mode: this.mode });
  }

  private quickRestart() {
    // "One more try" — instant restart, counts as a retry for star scoring.
    this.scene.restart({ level: this.cfg.id, retries: this.retries + 1, mode: this.mode });
  }

  private endLevel(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.trailPoints = [];

    if (this.mode === 'endless') {
      const record = Save.reportEndless(this.score);
      Audio.fail();
      this.cameras.main.shake(250, 0.012);
      this.time.delayedCall(500, () => {
        this.scene.start('GameOver', { mode: 'endless', won: false, score: this.score, record, level: 0, stars: 0, retries: this.retries });
      });
      return;
    }

    if (this.mode === 'daily') {
      const record = Save.reportDaily(this.score);
      if (won) Audio.win(); else Audio.fail();
      this.time.delayedCall(400, () => {
        this.scene.start('GameOver', { mode: 'daily', won, score: this.score, record, level: 0, stars: 0, retries: this.retries });
      });
      return;
    }

    Save.reportScore(this.cfg.id, this.score);
    if (won) {
      Audio.win();
      const beatPar = this.score >= this.cfg.parScore;
      const stars = Save.reportWin(
        this.cfg.id, this.score,
        this.timeToTarget || this.elapsed,
        this.retries, beatPar,
      );
      this.time.delayedCall(400, () => {
        if (this.cfg.id === 10) {
          this.scene.start('Victory', { score: this.score, stars });
        } else {
          this.scene.start('GameOver', { mode: 'campaign', won: true, level: this.cfg.id, score: this.score, stars, retries: this.retries });
        }
      });
    } else {
      Audio.fail();
      this.cameras.main.shake(250, 0.012);
      this.time.delayedCall(500, () => {
        this.scene.start('GameOver', { mode: 'campaign', won: false, level: this.cfg.id, score: this.score, stars: 0, retries: this.retries });
      });
    }
  }

  // ---------------------------------------------------------------- Update

  update(_time: number, deltaMs: number) {
    this.drawTrail();
    this.drawBarriers(deltaMs / 1000);
    if (!this.running) return;

    // Rainbow slow-motion eases back to full speed.
    const target = this.time.now < this.slowUntil ? 0.45 : 1;
    this.timeScale += (target - this.timeScale) * 0.15;
    if (target === 1 && this.timeScale > 0.98) this.timeScale = 1;
    this.slowVeil.fillAlpha = (1 - this.timeScale) * 0.15;

    const dt = (Math.min(deltaMs, 50) / 1000) * this.timeScale;
    this.elapsed += dt;
    if (this.mode !== 'endless') this.timeLeft -= dt;

    // Endless: re-tune difficulty continuously; rebuild barriers as they appear.
    if (this.mode === 'endless') {
      const prevBarriers = this.cfg.barriers;
      this.cfg = endlessTune(this.elapsed);
      if (this.cfg.barriers !== prevBarriers) {
        this.rebuildBarriers();
        this.popup(GAME_WIDTH / 2, 220, 'LASER BARRIER ONLINE', Palette.secondary, 26);
      }
    }

    // Wind flips direction every ~6s on windy levels.
    if (this.cfg.wind > 0) {
      this.windAcc += dt;
      if (this.windAcc > 6) { this.windAcc = 0; this.windDir *= -1; }
      this.wind = this.cfg.wind * this.windDir;
    }

    // Regular spawning.
    this.spawnAcc += deltaMs * this.timeScale;
    if (this.spawnAcc >= this.cfg.spawnInterval) {
      this.spawnAcc = 0;
      this.spawnBurst(this.randInt(this.cfg.burst[0], this.cfg.burst[1]));
    }

    // Boss level (and deep endless runs): periodic fruit storms.
    const stormActive = this.cfg.storm || (this.mode === 'endless' && this.elapsed > 90);
    if (stormActive) {
      this.stormAcc += dt;
      if (this.stormAcc > (this.mode === 'endless' ? 25 : 11)) {
        this.stormAcc = 0;
        this.popup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'FRUIT STORM!', Palette.primary, 46);
        this.cameras.main.shake(300, 0.006);
        this.spawnBurst(12);
      }
    }

    // Integrate physics + collect misses.
    for (const f of [...this.fruits]) {
      f.step(dt, this.wind);
      if (f.offBottom) {
        Phaser.Utils.Array.Remove(this.fruits, f);
        if (!f.missed) { f.missed = true; this.missFruit(f); }
        f.destroy();
      }
    }

    // Streak decay when the combo window closes.
    if (this.streak > 0 && this.time.now - this.lastSliceAt > COMBO_WINDOW) {
      this.streak = 0;
      this.frenzyArmed = true;
    }

    this.updateHud();

    if (this.mode !== 'endless' && this.timeLeft <= 0) {
      this.timeLeft = 0;
      // Daily is a score attack: surviving the minute always "wins".
      this.endLevel(this.mode === 'daily' ? true : this.score >= this.cfg.targetScore);
    }
  }

  /** Neon swipe trail in the equipped blade skin: wide glow + thin core. */
  private drawTrail() {
    this.trailGfx.clear();
    const pts = this.trailPoints;
    if (pts.length < 2) return;
    const now = this.time.now;
    const skin = trailColors(now);
    for (let i = 1; i < pts.length; i++) {
      const age = (now - pts[i].t) / this.inputMgr.maxTrailAge;
      const alpha = Phaser.Math.Clamp(1 - age, 0, 1);
      this.trailGfx.lineStyle(14 * alpha, skin.glow, 0.35 * alpha);
      this.trailGfx.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      this.trailGfx.lineStyle(5 * alpha, skin.core, 0.9 * alpha);
      this.trailGfx.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
  }

  /** Rotating laser barriers: pulsing cyan beams the blade cannot pass. */
  private drawBarriers(dtSec: number) {
    this.barrierGfx.clear();
    if (this.barriers.length === 0) return;
    const pulse = 0.65 + 0.35 * Math.sin(this.time.now / 180);
    for (const b of this.barriers) {
      if (this.running) b.angle += b.speed * dtSec * this.timeScale;
      const x1 = b.cx - Math.cos(b.angle) * b.len / 2;
      const y1 = b.cy - Math.sin(b.angle) * b.len / 2;
      const x2 = b.cx + Math.cos(b.angle) * b.len / 2;
      const y2 = b.cy + Math.sin(b.angle) * b.len / 2;
      this.barrierGfx.lineStyle(10, Palette.secondary, 0.18 * pulse);
      this.barrierGfx.lineBetween(x1, y1, x2, y2);
      this.barrierGfx.lineStyle(3, Palette.secondary, 0.95 * pulse);
      this.barrierGfx.lineBetween(x1, y1, x2, y2);
      this.barrierGfx.fillStyle(Palette.secondary, 0.9);
      this.barrierGfx.fillCircle(x1, y1, 5);
      this.barrierGfx.fillCircle(x2, y2, 5);
    }
  }
}
