import Phaser from 'phaser';
import { drawBackground, title, label, neonButton, goTo } from '../core/Ui';
import { Palette, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { FRUITS } from '../core/TextureFactory';
import { Audio } from '../core/AudioManager';
import { Save } from '../core/SaveManager';
import { SKINS, unlockedSkins, currentSkin } from '../core/Skins';

/**
 * Hero + grid layout: one oversized PLAY carries all the visual weight;
 * utilities sit in a compact 2×2 grid beneath it.
 */
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    drawBackground(this);
    this.cameras.main.fadeIn(300, 34, 28, 51);

    // Ambient fruit drifting behind the title.
    for (let i = 0; i < 8; i++) {
      const f = this.add.image(
        Phaser.Math.Between(60, GAME_WIDTH - 60),
        Phaser.Math.Between(80, GAME_HEIGHT - 80),
        FRUITS[i % FRUITS.length].key,
      ).setScale(0.5).setAlpha(0.22).setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: f,
        y: f.y - Phaser.Math.Between(20, 60),
        angle: f.angle + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    const t = title(this, GAME_WIDTH / 2, 150, 'NEON FRUIT CUTTER', 58);
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: 142, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 500,
    });

    label(this, GAME_WIDTH / 2, 214, 'Slice fruit. Dodge bombs. Chain combos.', 20);

    // Hero PLAY: the only oversized element, with a breathing glow.
    const play = neonButton(this, GAME_WIDTH / 2, 316, 'PLAY', () => {
      Audio.start();
      // First-time players get the guided tutorial before the level grid.
      goTo(this, Save.tutorialSeen ? 'LevelSelect' : 'Tutorial');
    }, 330, 78, Palette.primary, 32);
    const playGlow = play.list[0] as Phaser.GameObjects.Rectangle;
    this.tweens.add({
      targets: playGlow, fillAlpha: 0.22, duration: 950,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Utility grid, 2×2 — quiet, equal weight, out of the hero's way.
    const gx = [GAME_WIDTH / 2 - 108, GAME_WIDTH / 2 + 108];
    const gy = [412, 472];

    neonButton(this, gx[0], gy[0], 'TUTORIAL', () => {
      Audio.start();
      goTo(this, 'Tutorial');
    }, 200, 50, Palette.good, 18);

    const bladeBtn = neonButton(this, gx[1], gy[0], 'BLADE ▸', () => {
      const unlocked = unlockedSkins();
      const idx = unlocked.findIndex(sk => sk.id === currentSkin().id);
      const next = unlocked[(idx + 1) % unlocked.length];
      Save.setBlade(next.id);
      updateInfo();
    }, 200, 50, Palette.accent, 18);
    void bladeBtn;

    const muteBtn = neonButton(this, gx[0], gy[1], Audio.muted ? 'SOUND: OFF' : 'SOUND: ON', () => {
      const m = Audio.toggleMute();
      (muteBtn.list[2] as Phaser.GameObjects.Text).setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    }, 200, 50, Palette.secondary, 18);

    neonButton(this, gx[1], gy[1], 'RESET', () => {
      Save.reset();
      updateInfo();
      this.cameras.main.flash(160, 184, 167, 232);
    }, 200, 50, Palette.textDim, 18);

    // One shared status line under the grid: blade + star progress.
    const info = label(this, GAME_WIDTH / 2, 522, '', 14);
    const updateInfo = () => {
      const stars = Save.totalStars();
      const nextLocked = SKINS.find(sk => stars < sk.req);
      info.setText(
        `Blade: ${currentSkin().name} · ${stars}★ collected` +
        (nextLocked ? ` · next blade at ${nextLocked.req}★` : ' · all blades unlocked'),
      );
    };
    updateInfo();

    // Back to the rest of the site for users who land directly on this game.
    const moreGames = label(this, GAME_WIDTH / 2, 548, 'MORE GAMES', 22, Palette.accent);
    moreGames.setInteractive({ useHandCursor: true });
    moreGames.on('pointerdown', () => {
      Audio.start();
      window.open('https://krazic.com/', '_blank', 'noopener,noreferrer');
    });

    const touch = 'ontouchstart' in window;
    label(this, GAME_WIDTH / 2, GAME_HEIGHT - 22,
      touch ? 'Swipe to slice · tap ⏸ to pause' : 'Drag to slice  ·  Esc pause  ·  R restart  ·  M mute', 14);
  }
}
