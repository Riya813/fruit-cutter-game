import Phaser from 'phaser';

export interface SwipePoint { x: number; y: number; t: number }

export interface InputCallbacks {
  onSwipeMove?: (points: SwipePoint[]) => void;
  onSwipeEnd?: () => void;
  onPause?: () => void;
  onRestart?: () => void;
  onMute?: () => void;
}

/**
 * Unified input layer. Pointer events cover both mouse and touch
 * (Phaser normalizes touches into pointers), so the same swipe path
 * works on mobile without changes. Esc/R/M remain as system keys.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private cb: InputCallbacks;
  private tracking = false;
  private points: SwipePoint[] = [];
  readonly maxTrailAge = 220; // ms a trail point stays visible

  constructor(scene: Phaser.Scene, cb: InputCallbacks) {
    this.scene = scene;
    this.cb = cb;

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.beginSwipe(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.moveSwipe(p));
    scene.input.on('pointerup', () => this.endSwipe());

    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => cb.onPause?.());
      kb.on('keydown-R', () => cb.onRestart?.());
      kb.on('keydown-M', () => cb.onMute?.());
    }
  }

  private beginSwipe(p: Phaser.Input.Pointer) {
    this.tracking = true;
    this.points = [{ x: p.worldX, y: p.worldY, t: this.scene.time.now }];
  }

  private moveSwipe(p: Phaser.Input.Pointer) {
    if (!this.tracking) return;
    this.points.push({ x: p.worldX, y: p.worldY, t: this.scene.time.now });
    this.prune();
    this.cb.onSwipeMove?.(this.points);
  }

  private endSwipe() {
    this.tracking = false;
    this.points = [];
    this.cb.onSwipeEnd?.();
  }

  private prune() {
    const cutoff = this.scene.time.now - this.maxTrailAge;
    while (this.points.length > 2 && this.points[0].t < cutoff) this.points.shift();
  }

  destroy() {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
  }
}
