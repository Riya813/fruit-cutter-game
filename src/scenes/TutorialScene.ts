import Phaser from 'phaser';
import { drawBackground, neonButton } from '../core/Ui';
import { Palette, Fonts, hex, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { FRUITS, GLOW_KEY, PARTICLE_KEY } from '../core/TextureFactory';
import { Fruit, FruitVariant } from '../objects/Fruit';
import { InputManager, SwipePoint } from '../core/InputManager';
import { Audio } from '../core/AudioManager';
import { Save } from '../core/SaveManager';
import { trailColors } from '../core/Skins';

/**
 * Interactive tutorial: seven hands-on steps in a pressure-free sandbox
 * (no lives, no timer, no score penalties). Each step spawns real objects
 * and advances only when the player performs the action — learning by doing.
 */
const STEP_TEXT = [
  'Drag across the fruit to SLICE it!',
  'Cut through the CENTER of the fruit\nfor a CRITICAL — double points!',
  'Slice all 3 fruit quickly!\nChained slices build a STREAK multiplier.',
  'That\'s a BOMB — slicing it costs a life.\nLet it fall. Bombs are safe to drop!',
  'A steel SPIKE ORB. Slicing it breaks your\nstreak (–30) but costs no life. Your call!',
  'That cyan beam is a LASER BARRIER —\nyour blade stops on it. Slice AROUND it!',
];

export class TutorialScene extends Phaser.Scene {
  private step = 0;
  private fruits: Fruit[] = [];
  private inputMgr!: InputManager;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private barrierGfx!: Phaser.GameObjects.Graphics;
  private trailPoints: SwipePoint[] = [];
  private instr!: Phaser.GameObjects.Text;
  private stepLabel!: Phaser.GameObjects.Text;
  private done = false;
  private stepState = 0;           // per-step counter (slices, attempts…)
  private respawnAt = 0;           // clock time for pending respawn
  private barrierAngle = 0;

  constructor() { super('Tutorial'); }

  create() {
    this.step = 0;
    this.fruits = [];
    this.done = false;
    this.stepState = 0;
    this.respawnAt = 0;

    drawBackground(this);
    this.cameras.main.fadeIn(250, 18, 8, 31);
    this.barrierGfx = this.add.graphics().setDepth(30);
    this.trailGfx = this.add.graphics().setDepth(50);

    // Instruction panel.
    this.add.rectangle(GAME_WIDTH / 2, 84, 640, 104, 0x000000, 0.45)
      .setStrokeStyle(2, Palette.secondary, 0.8).setDepth(60);
    this.stepLabel = this.add.text(GAME_WIDTH / 2, 48, '', {
      fontFamily: Fonts.body, fontSize: '14px', color: hex(Palette.textDim),
    }).setOrigin(0.5).setDepth(61);
    this.instr = this.add.text(GAME_WIDTH / 2, 92, '', {
      fontFamily: Fonts.display, fontSize: '21px', color: hex(Palette.white), align: 'center',
    }).setOrigin(0.5).setDepth(61);

    neonButton(this, GAME_WIDTH - 90, 30, 'SKIP ✕', () => this.finish(false), 130, 40, Palette.textDim).setDepth(62);

    this.inputMgr = new InputManager(this, {
      onSwipeMove: pts => { this.trailPoints = pts; this.handleSwipe(pts); },
      onSwipeEnd: () => { this.trailPoints = []; },
      onPause: () => this.finish(false),
      onMute: () => Audio.toggleMute(),
    });

    this.enterStep(0);
  }

  // ---------------------------------------------------------------- Steps

  private enterStep(n: number) {
    this.step = n;
    this.stepState = 0;
    this.respawnAt = 0;
    for (const f of this.fruits) f.destroy();
    this.fruits = [];

    this.stepLabel.setText(`TUTORIAL · STEP ${n + 1} / ${STEP_TEXT.length}`);
    this.instr.setText(STEP_TEXT[n]).setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: this.instr, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    Audio.tick();

    // Initial spawns per step.
    switch (n) {
      case 0: case 1: this.spawnTut('fruit'); break;
      case 2: [0, 250, 500].forEach(d => this.time.delayedCall(d, () => this.spawnTut('fruit'))); break;
      case 3: this.spawnTut('bomb'); break;
      case 4: this.spawnTut('spike'); break;
      case 5: this.barrierAngle = 0; this.spawnTut('fruit'); break;
    }
  }

  private stepComplete(message: string) {
    Audio.combo(4);
    this.popup(GAME_WIDTH / 2, 200, message, Palette.good, 30);
    const next = this.step + 1;
    this.time.delayedCall(900, () => {
      if (next >= STEP_TEXT.length) this.finish(true);
      else this.enterStep(next);
    });
    this.step = -1; // pause step logic during the transition
  }

  private finish(completed: boolean) {
    if (this.done) return;
    this.done = true;
    Save.setTutorialSeen();
    if (!completed) { this.scene.start('LevelSelect'); return; }

    Audio.win();
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(90);
    veil.setAlpha(0);
    this.tweens.add({ targets: veil, alpha: 1, duration: 250 });
    const t = this.add.text(GAME_WIDTH / 2, 250, 'YOU\'RE READY!', {
      fontFamily: Fonts.display, fontSize: '54px', color: hex(Palette.white),
      stroke: hex(Palette.primary), strokeThickness: 8,
    }).setOrigin(0.5).setDepth(91).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.add.text(GAME_WIDTH / 2, 320, 'Reach the target score to clear a level.\nBeat PAR with no retries for 3 stars.', {
      fontFamily: Fonts.body, fontSize: '19px', color: hex(Palette.textDim), align: 'center',
    }).setOrigin(0.5).setDepth(91);
    neonButton(this, GAME_WIDTH / 2, 420, 'START PLAYING', () => this.scene.start('LevelSelect'), 300, 60, Palette.primary).setDepth(91);
  }

  // ---------------------------------------------------------------- Sandbox

  private spawnTut(variant: FruitVariant) {
    const x = Phaser.Math.Between(GAME_WIDTH / 2 - 180, GAME_WIDTH / 2 + 180);
    const vx = (GAME_WIDTH / 2 - x) * 0.3;
    const vy = -Phaser.Math.FloatBetween(600, 680);
    const fruit = variant === 'fruit'
      ? new Fruit(this, x, GAME_HEIGHT + 60, Phaser.Utils.Array.GetRandom(FRUITS), 'big', vx, vy)
      : new Fruit(this, x, GAME_HEIGHT + 60, null, 'medium', vx, vy, variant);
    this.fruits.push(fruit);
  }

  private handleSwipe(pts: SwipePoint[]) {
    if (pts.length < 2) return;
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < 6) return;
    this.sliceSegment(a.x, a.y, b.x, b.y);
  }

  private sliceSegment(x1: number, y1: number, x2: number, y2: number) {
    // Barrier step: clip the blade exactly like the real game.
    if (this.step === 5) {
      const clip = this.clipAtBarrier(x1, y1, x2, y2);
      if (clip.blocked) {
        Audio.fizzle();
        const spark = this.add.image(clip.x, clip.y, GLOW_KEY).setTint(Palette.secondary).setScale(1.4).setDepth(45);
        this.tweens.add({ targets: spark, alpha: 0, scale: 2.2, duration: 200, onComplete: () => spark.destroy() });
        x2 = clip.x; y2 = clip.y;
        if (this.stepState === 0) {
          this.stepState = 1; // acknowledge their first blocked attempt
          this.popup(GAME_WIDTH / 2, 250, 'BLOCKED! Now go around it', Palette.secondary, 24);
        }
      }
    }

    const angle = Math.atan2(y2 - y1, x2 - x1);
    for (const f of [...this.fruits]) {
      if (f.sliced) continue;
      const d = f.distToSegment(x1, y1, x2, y2);
      if (d > f.radius) continue;

      if (f.isBomb) { this.tutBombHit(f); continue; }
      if (f.isSpike) { this.tutSpikeHit(f); continue; }
      this.tutFruitSliced(f, angle, d <= f.radius * 0.3);
    }
  }

  private tutFruitSliced(f: Fruit, angle: number, critical: boolean) {
    f.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, f);
    Audio.slice(this.stepState);
    if (critical) Audio.critical();
    f.spawnHalves(angle);
    const em = this.add.particles(f.x, f.y, PARTICLE_KEY, {
      speed: { min: 80, max: 300 }, scale: { start: 1.3, end: 0 },
      lifespan: { min: 250, max: 550 }, gravityY: 500, tint: f.kind!.color, emitting: false,
    });
    em.explode(critical ? 24 : 12, f.x, f.y);
    this.time.delayedCall(1000, () => em.destroy());
    this.popup(f.x, f.y - 30, critical ? 'CRITICAL!' : 'NICE!', critical ? Palette.accent : Palette.white, critical ? 28 : 20);
    f.destroy();

    switch (this.step) {
      case 0: this.stepComplete('SLICED! ✓'); break;
      case 1:
        if (critical) this.stepComplete('CRITICAL HIT! ✓');
        else {
          this.stepState++;
          if (this.stepState >= 3) this.stepComplete('CLOSE ENOUGH! ✓');
          else { this.popup(GAME_WIDTH / 2, 250, 'Good — now try the exact center', Palette.textDim, 20); this.respawnAt = this.time.now + 500; }
        }
        break;
      case 2:
        this.stepState++;
        this.popup(GAME_WIDTH / 2, 250, `STREAK ${this.stepState}!`, Palette.accent, 26);
        if (this.stepState >= 3) this.stepComplete('MULTIPLIER UP! ✓');
        break;
      case 5: this.stepComplete('SLICED AROUND IT! ✓'); break;
    }
  }

  private tutBombHit(bomb: Fruit) {
    bomb.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, bomb);
    Audio.bomb();
    this.cameras.main.shake(250, 0.015);
    this.cameras.main.flash(180, 255, 59, 59);
    this.popup(bomb.x, bomb.y - 40, 'BOOM! That costs a life for real!', Palette.danger, 24);
    bomb.destroy();
    if (this.step === 3) this.respawnAt = this.time.now + 800; // try again
  }

  private tutSpikeHit(spike: Fruit) {
    spike.sliced = true;
    Phaser.Utils.Array.Remove(this.fruits, spike);
    Audio.clang();
    this.cameras.main.shake(120, 0.007);
    this.popup(spike.x, spike.y - 40, 'CLANG! Streak gone, life kept', 0xd7dee9, 22);
    spike.destroy();
    if (this.step === 4) this.stepComplete('LESSON LEARNED! ✓');
  }

  private clipAtBarrier(x1: number, y1: number, x2: number, y2: number) {
    const b = this.barrierLine();
    const seg = new Phaser.Geom.Line(x1, y1, x2, y2);
    const out = new Phaser.Geom.Point();
    if (Phaser.Geom.Intersects.LineToLine(seg, b, out)) {
      return { x: out.x, y: out.y, blocked: true };
    }
    return { x: x2, y: y2, blocked: false };
  }

  private barrierLine() {
    const cx = GAME_WIDTH / 2, cy = 330, len = 220;
    return new Phaser.Geom.Line(
      cx - Math.cos(this.barrierAngle) * len / 2, cy - Math.sin(this.barrierAngle) * len / 2,
      cx + Math.cos(this.barrierAngle) * len / 2, cy + Math.sin(this.barrierAngle) * len / 2,
    );
  }

  private popup(x: number, y: number, text: string, color: number, size: number) {
    const t = this.add.text(x, y, text, {
      fontFamily: Fonts.display, fontSize: `${size}px`, color: hex(color),
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(70).setScale(0.5);
    this.tweens.add({
      targets: t, scale: 1, y: y - 40, duration: 500, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: t, alpha: 0, duration: 220, onComplete: () => t.destroy() }),
    });
  }

  // ---------------------------------------------------------------- Frame

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 50) / 1000;

    // Trail.
    this.trailGfx.clear();
    const pts = this.trailPoints;
    const now = this.time.now;
    const skin = trailColors(now);
    for (let i = 1; i < pts.length; i++) {
      const alpha = Phaser.Math.Clamp(1 - (now - pts[i].t) / this.inputMgr.maxTrailAge, 0, 1);
      this.trailGfx.lineStyle(14 * alpha, skin.glow, 0.35 * alpha);
      this.trailGfx.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      this.trailGfx.lineStyle(5 * alpha, skin.core, 0.9 * alpha);
      this.trailGfx.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }

    // Barrier (step 5 only), rotating slowly.
    this.barrierGfx.clear();
    if (this.step === 5) {
      this.barrierAngle += 0.4 * dt;
      const b = this.barrierLine();
      const pulse = 0.65 + 0.35 * Math.sin(now / 180);
      this.barrierGfx.lineStyle(10, Palette.secondary, 0.18 * pulse);
      this.barrierGfx.lineBetween(b.x1, b.y1, b.x2, b.y2);
      this.barrierGfx.lineStyle(3, Palette.secondary, 0.95 * pulse);
      this.barrierGfx.lineBetween(b.x1, b.y1, b.x2, b.y2);
      this.barrierGfx.fillStyle(Palette.secondary, 0.9);
      this.barrierGfx.fillCircle(b.x1, b.y1, 5);
      this.barrierGfx.fillCircle(b.x2, b.y2, 5);
    }

    if (this.done) return;

    // Physics + fall handling.
    for (const f of [...this.fruits]) {
      f.step(dt, 0);
      if (!f.offBottom) continue;
      Phaser.Utils.Array.Remove(this.fruits, f);
      f.destroy();
      if (this.step === 3 && f.isBomb) { this.stepComplete('SMART — LET IT FALL! ✓'); continue; }
      if (this.step === 4 && f.isSpike) { this.stepComplete('DODGED IT! ✓'); continue; }
      this.respawnAt = now + 400; // fruit escaped: give them another
    }

    // Pending respawns for the active step.
    if (this.respawnAt > 0 && now >= this.respawnAt && this.step >= 0) {
      this.respawnAt = 0;
      switch (this.step) {
        case 0: case 1: case 5: this.spawnTut('fruit'); break;
        case 2: if (this.fruits.length === 0) [0, 250, 500].forEach(d => this.time.delayedCall(d, () => { if (this.step === 2) this.spawnTut('fruit'); })); break;
        case 3: this.spawnTut('bomb'); break;
        case 4: this.spawnTut('spike'); break;
      }
    }
  }
}
