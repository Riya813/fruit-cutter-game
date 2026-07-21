import Phaser from 'phaser';
import { FruitKind, BOMB_KEY, SPIKE_KEY, POWER_KEY } from '../core/TextureFactory';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';

export type FruitSize = 'small' | 'medium' | 'big';
export type FruitVariant = 'fruit' | 'bomb' | 'spike' | 'power';
export type SpecialKind = 'golden' | 'frozen' | 'rainbow' | null;

// Small fruit are faster targets worth more; big ones are slow easy points.
const SIZE_DEF: Record<FruitSize, { scale: number; mul: number }> = {
  small:  { scale: 0.55, mul: 2.0 },
  medium: { scale: 0.85, mul: 1.0 },
  big:    { scale: 1.15, mul: 0.6 },
};

const GRAVITY = 520;

export class Fruit extends Phaser.GameObjects.Image {
  kind: FruitKind | null; // null for bombs, spikes, and power orbs
  variant: FruitVariant;
  special: SpecialKind = null;
  cracked = false; // frozen fruit: true after the first hit
  fruitSize: FruitSize;
  vx: number;
  vy: number;
  spin: number;
  sliced = false;
  missed = false;
  radius: number;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    kind: FruitKind | null, size: FruitSize, vx: number, vy: number,
    variant: FruitVariant = kind ? 'fruit' : 'bomb',
  ) {
    super(scene, x, y, kind ? kind.key : variant === 'spike' ? SPIKE_KEY : variant === 'power' ? POWER_KEY : BOMB_KEY);
    this.kind = kind;
    this.variant = variant;
    this.fruitSize = kind ? size : 'medium';
    const def = SIZE_DEF[this.fruitSize];
    this.setScale(def.scale);
    this.radius = 44 * def.scale;
    this.vx = vx;
    this.vy = vy;
    this.spin = Phaser.Math.FloatBetween(-2.4, 2.4);
    scene.add.existing(this);
  }

  get isBomb() { return this.variant === 'bomb'; }
  get isSpike() { return this.variant === 'spike'; }
  get isPower() { return this.variant === 'power'; }

  get pointMultiplier() { return SIZE_DEF[this.fruitSize].mul; }

  /** Manual integration: gravity, wind, spin, and ceiling bounce. */
  step(dtSec: number, wind: number) {
    this.vy += GRAVITY * dtSec;
    this.vx += wind * dtSec;
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
    this.rotation += this.spin * dtSec;

    // Fruit that reaches the top bounces back down instead of leaving play.
    if (this.y < this.radius && this.vy < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy) * 0.55;
    }
    // Soft side walls keep windy levels playable.
    if (this.x < this.radius && this.vx < 0) { this.x = this.radius; this.vx = Math.abs(this.vx) * 0.8; }
    if (this.x > GAME_WIDTH - this.radius && this.vx > 0) { this.x = GAME_WIDTH - this.radius; this.vx = -Math.abs(this.vx) * 0.8; }
  }

  get offBottom() { return this.y > GAME_HEIGHT + this.radius * 2; }

  /** Distance from a segment to this fruit's center; used for hit + critical tests. */
  distToSegment(x1: number, y1: number, x2: number, y2: number): number {
    // Project the center onto the segment, clamped to its endpoints.
    const t = Phaser.Math.Clamp(
      ((this.x - x1) * (x2 - x1) + (this.y - y1) * (y2 - y1)) /
      (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) || 1), 0, 1);
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    return Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
  }

  /** Spawns the two spinning halves flying apart along the cut direction. */
  spawnHalves(cutAngleRad: number) {
    if (!this.kind) return;
    const scene = this.scene;
    for (const side of [0, 1]) {
      const half = scene.add.image(this.x, this.y, `${this.kind.key}-half${side}`)
        .setScale(this.scale)
        .setRotation(cutAngleRad + (side ? Math.PI : 0));
      const push = 160;
      const nx = Math.cos(cutAngleRad + Math.PI / 2) * (side ? 1 : -1);
      const ny = Math.sin(cutAngleRad + Math.PI / 2) * (side ? 1 : -1);
      const hvx = this.vx * 0.5 + nx * push;
      const hvy = this.vy * 0.5 + ny * push - 80;
      scene.tweens.add({
        targets: half,
        x: half.x + hvx * 0.9,
        y: half.y + hvy * 0.9 + 420,
        rotation: half.rotation + (side ? 2.5 : -2.5),
        alpha: 0,
        duration: 900,
        ease: 'Quad.easeIn',
        onComplete: () => half.destroy(),
      });
    }
  }
}
