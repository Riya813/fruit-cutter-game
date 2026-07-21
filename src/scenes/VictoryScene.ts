import Phaser from 'phaser';
import { drawBackground, title, label, neonButton, starRow, tickScore, goTo } from '../core/Ui';
import { Palette, Fonts, hex, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { PARTICLE_KEY } from '../core/TextureFactory';
import { Save } from '../core/SaveManager';

export class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }

  create(data: { score: number; stars: number }) {
    drawBackground(this);
    this.cameras.main.fadeIn(300, 18, 8, 31);

    // Continuous confetti rain in palette colors.
    this.add.particles(0, -10, PARTICLE_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 120, max: 300 },
      speedX: { min: -60, max: 60 },
      scale: { start: 1.6, end: 0.4 },
      rotate: { min: 0, max: 360 },
      lifespan: 4200,
      quantity: 2,
      frequency: 60,
      tint: [Palette.primary, Palette.secondary, Palette.accent, Palette.good],
    });

    const t = title(this, GAME_WIDTH / 2, 140, 'FRUIT STORM SURVIVED!', 48);
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 600, ease: 'Elastic.easeOut' });

    label(this, GAME_WIDTH / 2, 205, 'All 10 levels complete — you are the Neon Blade.', 20);

    const scoreText = this.add.text(GAME_WIDTH / 2, 270, '0', {
      fontFamily: Fonts.display, fontSize: '52px', color: hex(Palette.accent),
    }).setOrigin(0.5).setShadow(0, 0, hex(Palette.accent), 16, true, true);
    tickScore(this, scoreText, data.score);

    starRow(this, GAME_WIDTH / 2, 345, data.stars, 38, true);

    const total = Array.from({ length: 10 }, (_, i) => Save.record(i + 1).stars).reduce((a, b) => a + b, 0);
    label(this, GAME_WIDTH / 2, 400, `Total stars collected: ${total} / 30`, 18, Palette.accent);
    label(this, GAME_WIDTH / 2, 428, 'ENDLESS MODE UNLOCKED — find it in Level Select', 16, Palette.good);

    neonButton(this, GAME_WIDTH / 2, 480, 'PLAY AGAIN', () =>
      goTo(this, 'Game', { level: 10 }), 280, 58, Palette.primary);
    neonButton(this, GAME_WIDTH / 2, 555, 'LEVEL SELECT', () =>
      goTo(this, 'LevelSelect'), 280, 52, Palette.secondary);

    label(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Chase 30 stars: beat PAR on every level without retries.', 15);
  }
}
