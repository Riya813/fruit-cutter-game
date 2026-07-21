import Phaser from 'phaser';
import { drawBackground, title, label, neonButton, goTo } from '../core/Ui';
import { Palette, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { FRUITS } from '../core/TextureFactory';
import { Audio } from '../core/AudioManager';
import { Save } from '../core/SaveManager';
import { SKINS, unlockedSkins, currentSkin } from '../core/Skins';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    drawBackground(this);
    this.cameras.main.fadeIn(300, 18, 8, 31);

    // Ambient fruit drifting behind the title.
    for (let i = 0; i < 8; i++) {
      const f = this.add.image(
        Phaser.Math.Between(60, GAME_WIDTH - 60),
        Phaser.Math.Between(80, GAME_HEIGHT - 80),
        FRUITS[i % FRUITS.length].key,
      ).setScale(0.5).setAlpha(0.25).setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: f,
        y: f.y - Phaser.Math.Between(20, 60),
        angle: f.angle + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    const t = title(this, GAME_WIDTH / 2, 170, 'NEON FRUIT CUTTER', 58);
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: 162, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 500,
    });

    label(this, GAME_WIDTH / 2, 235, 'Slice fruit. Dodge bombs. Chain combos.', 20);

    neonButton(this, GAME_WIDTH / 2, 330, 'PLAY', () => {
      Audio.start();
      // First-time players get the guided tutorial before the level grid.
      goTo(this, Save.tutorialSeen ? 'LevelSelect' : 'Tutorial');
    }, 280, 64, Palette.primary);

    neonButton(this, GAME_WIDTH / 2, 400, 'TUTORIAL', () => {
      Audio.start();
      goTo(this, 'Tutorial');
    }, 280, 48, Palette.good);

    // Blade skin selector: cycles through skins unlocked by total stars.
    const bladeBtn = neonButton(this, GAME_WIDTH / 2, 464, `BLADE: ${currentSkin().name.toUpperCase()}`, () => {
      const unlocked = unlockedSkins();
      const idx = unlocked.findIndex(sk => sk.id === currentSkin().id);
      const next = unlocked[(idx + 1) % unlocked.length];
      Save.setBlade(next.id);
      (bladeBtn.list[2] as Phaser.GameObjects.Text).setText(`BLADE: ${next.name.toUpperCase()}`);
    }, 280, 48, Palette.accent);
    const stars = Save.totalStars();
    const nextLocked = SKINS.find(sk => stars < sk.req);
    label(this, GAME_WIDTH / 2, 498,
      nextLocked ? `${stars}★ collected · next blade at ${nextLocked.req}★` : `${stars}★ — all blades unlocked!`, 13);

    neonButton(this, GAME_WIDTH / 2, 540, 'RESET PROGRESS', () => {
      Save.reset();
      this.cameras.main.flash(160, 255, 46, 151);
    }, 280, 44, Palette.textDim);

    const muteBtn = neonButton(this, GAME_WIDTH / 2, 594, Audio.muted ? 'SOUND: OFF' : 'SOUND: ON', () => {
      const m = Audio.toggleMute();
      (muteBtn.list[2] as Phaser.GameObjects.Text).setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    }, 280, 44, Palette.secondary);

    const touch = 'ontouchstart' in window;
    label(this, GAME_WIDTH / 2, GAME_HEIGHT - 12,
      touch ? 'Swipe to slice · tap ⏸ to pause' : 'Drag to slice  ·  Esc pause  ·  R restart  ·  M mute', 14);
  }
}
