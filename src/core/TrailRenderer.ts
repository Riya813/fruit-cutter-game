import Phaser from 'phaser';
import { SwipePoint } from './InputManager';
import { currentSkin, hueCycle, BladeStyle } from './Skins';
import { GLOW_KEY, PARTICLE_KEY } from './TextureFactory';

const SHED_STYLES = new Set<BladeStyle>(['ember', 'petal', 'frost', 'shadow']);

/**
 * Renders the swipe trail in the equipped blade's style. Shared by
 * GameScene and TutorialScene so every effect looks identical everywhere.
 */
export class TrailRenderer {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private lastShed = 0;

  constructor(scene: Phaser.Scene, depth = 50) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  draw(pts: SwipePoint[], maxAge: number) {
    const g = this.gfx;
    g.clear();
    if (pts.length < 2) return;

    const skin = currentSkin();
    const now = this.scene.time.now;
    const glow = skin.style === 'rainbow' ? hueCycle(now) : skin.glow;

    // Styles that shed particles do so from the trail tip, throttled.
    if (SHED_STYLES.has(skin.style) && now - this.lastShed > 35) {
      this.lastShed = now;
      this.shed(skin.style, pts[pts.length - 1]);
    }

    for (let i = 1; i < pts.length; i++) {
      const age = (now - pts[i].t) / maxAge;
      const alpha = Phaser.Math.Clamp(1 - age, 0, 1);
      const x1 = pts[i - 1].x, y1 = pts[i - 1].y;
      const x2 = pts[i].x, y2 = pts[i].y;

      switch (skin.style) {
        case 'arc': {
          // Jagged lightning: each segment kinks at a jittered midpoint.
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const off = (Math.random() - 0.5) * 12;
          const mx = (x1 + x2) / 2 + nx * off, my = (y1 + y2) / 2 + ny * off;
          const flick = alpha * (0.6 + Math.random() * 0.4);
          g.lineStyle(6 * alpha, glow, 0.4 * flick);
          g.lineBetween(x1, y1, mx, my); g.lineBetween(mx, my, x2, y2);
          g.lineStyle(2.5 * alpha, skin.core, 0.95 * flick);
          g.lineBetween(x1, y1, mx, my); g.lineBetween(mx, my, x2, y2);
          break;
        }
        case 'glitch': {
          // Chromatic aberration: cyan/magenta ghosts offset from a white core.
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len * 3.5, ny = dx / len * 3.5;
          g.lineStyle(5 * alpha, 0x59f0ff, 0.55 * alpha);
          g.lineBetween(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
          g.lineStyle(5 * alpha, 0xff59c8, 0.55 * alpha);
          g.lineBetween(x1 - nx, y1 - ny, x2 - nx, y2 - ny);
          g.lineStyle(3 * alpha, 0xffffff, 0.9 * alpha);
          g.lineBetween(x1, y1, x2, y2);
          break;
        }
        case 'shadow': {
          // Wide dark aura with a near-black core.
          g.lineStyle(20 * alpha, glow, 0.28 * alpha);
          g.lineBetween(x1, y1, x2, y2);
          g.lineStyle(6 * alpha, skin.core, 0.9 * alpha);
          g.lineBetween(x1, y1, x2, y2);
          break;
        }
        default: {
          g.lineStyle(14 * alpha, glow, 0.35 * alpha);
          g.lineBetween(x1, y1, x2, y2);
          g.lineStyle(5 * alpha, skin.core, 0.9 * alpha);
          g.lineBetween(x1, y1, x2, y2);
        }
      }
    }
  }

  private shed(style: BladeStyle, p: SwipePoint) {
    const s = this.scene;
    switch (style) {
      case 'ember': {
        const e = s.add.image(p.x, p.y, PARTICLE_KEY)
          .setTint(Math.random() < 0.5 ? 0xffa040 : 0xff6030)
          .setScale(1.2).setDepth(49);
        s.tweens.add({
          targets: e, y: p.y + 30 + Math.random() * 30, x: p.x + (Math.random() - 0.5) * 24,
          alpha: 0, scale: 0.3, duration: 420, onComplete: () => e.destroy(),
        });
        break;
      }
      case 'petal': {
        const e = s.add.image(p.x, p.y, PARTICLE_KEY)
          .setTint(0xffb3d4).setScale(1.5).setAngle(Math.random() * 360).setDepth(49);
        s.tweens.add({
          targets: e, y: p.y + 26, x: p.x + (Math.random() - 0.5) * 40,
          angle: e.angle + 200, alpha: 0, duration: 620, onComplete: () => e.destroy(),
        });
        break;
      }
      case 'frost': {
        const e = s.add.image(p.x, p.y, PARTICLE_KEY)
          .setTint(0xdff4ff).setScale(0.9).setDepth(49);
        s.tweens.add({
          targets: e, y: p.y - 22, alpha: 0, scale: 0.2, duration: 360, onComplete: () => e.destroy(),
        });
        break;
      }
      case 'shadow': {
        const e = s.add.image(p.x, p.y, GLOW_KEY)
          .setTint(0x4a2e73).setAlpha(0.35).setScale(1.1).setDepth(48);
        s.tweens.add({
          targets: e, scale: 2.4, alpha: 0, duration: 460, onComplete: () => e.destroy(),
        });
        break;
      }
    }
  }
}
