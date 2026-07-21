import Phaser from 'phaser';
import { drawBackground, title, neonButton, starRow, goTo } from '../core/Ui';
import { Palette, Fonts, hex, GAME_WIDTH } from '../core/Palette';
import { LEVELS } from '../config/levels';
import { Save } from '../core/SaveManager';
import { Audio } from '../core/AudioManager';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    drawBackground(this);
    this.cameras.main.fadeIn(250, 18, 8, 31);
    title(this, GAME_WIDTH / 2, 64, 'SELECT LEVEL', 44);

    const cols = 5, cardW = 158, cardH = 176, gapX = 24, gapY = 26;
    const startX = (GAME_WIDTH - (cols * cardW + (cols - 1) * gapX)) / 2 + cardW / 2;
    const startY = 190;

    LEVELS.forEach((lvl, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const unlocked = lvl.id <= Save.unlocked;
      const rec = Save.record(lvl.id);

      const card = this.add.container(x, y);
      const borderColor = lvl.id === 10 ? Palette.accent : unlocked ? Palette.secondary : 0x3a2a5e;
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x000000, unlocked ? 0.4 : 0.6)
        .setStrokeStyle(3, borderColor, 1);
      card.add(bg);

      card.add(this.add.text(0, -62, `${lvl.id}`, {
        fontFamily: Fonts.display, fontSize: '38px',
        color: unlocked ? hex(Palette.white) : '#4a3a6e',
      }).setOrigin(0.5));

      card.add(this.add.text(0, -26, unlocked ? lvl.name : 'LOCKED', {
        fontFamily: Fonts.body, fontSize: '14px',
        color: unlocked ? hex(Palette.secondary) : '#4a3a6e',
      }).setOrigin(0.5));

      if (unlocked) {
        card.add(starRow(this, 0, 8, rec.stars, 20));
        card.add(this.add.text(0, 44, rec.bestScore > 0 ? `Best ${rec.bestScore}` : '—', {
          fontFamily: Fonts.body, fontSize: '13px', color: hex(Palette.textDim),
        }).setOrigin(0.5));
        card.add(this.add.text(0, 64, rec.bestTime > 0 ? `Clear ${rec.bestTime.toFixed(1)}s` : '', {
          fontFamily: Fonts.body, fontSize: '13px', color: hex(Palette.textDim),
        }).setOrigin(0.5));

        card.setSize(cardW, cardH).setInteractive({ useHandCursor: true });
        card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.06, duration: 110, ease: 'Back.easeOut' }));
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 110 }));
        card.on('pointerdown', () => {
          Audio.start();
          goTo(this, 'Game', { level: lvl.id });
        });
      } else {
        // Padlock icon drawn with shapes.
        const lock = this.add.container(0, 30);
        lock.add(this.add.rectangle(0, 6, 26, 20, 0x4a3a6e));
        lock.add(this.add.arc(0, -6, 9, 180, 360, false).setStrokeStyle(4, 0x4a3a6e).setClosePath(false));
        card.add(lock);
      }

      // Cascade the cards in.
      card.setAlpha(0).setY(y + 24);
      this.tweens.add({
        targets: card, alpha: 1, y, delay: i * 45, duration: 300, ease: 'Cubic.easeOut',
      });
    });

    // Special modes row.
    const endlessOpen = Save.endlessUnlocked;
    const endlessBtn = neonButton(this, 250, 596,
      endlessOpen ? 'ENDLESS' : 'ENDLESS 🔒', () => {
        if (!endlessOpen) {
          this.cameras.main.shake(120, 0.004);
          return;
        }
        Audio.start();
        goTo(this, 'Game', { mode: 'endless' });
      }, 230, 48, endlessOpen ? Palette.primary : 0x3a2a5e);
    if (!endlessOpen) endlessBtn.setAlpha(0.7);
    this.add.text(250, 628, endlessOpen ? `Best: ${Save.endlessBest}` : 'Clear level 10 to unlock', {
      fontFamily: Fonts.body, fontSize: '13px', color: hex(Palette.textDim),
    }).setOrigin(0.5);

    neonButton(this, 480, 596, 'DAILY', () => {
      Audio.start();
      goTo(this, 'Game', { mode: 'daily' });
    }, 230, 48, Palette.accent);
    this.add.text(480, 628, Save.dailyBest() > 0 ? `Today's best: ${Save.dailyBest()}` : 'Same fruit for everyone today', {
      fontFamily: Fonts.body, fontSize: '13px', color: hex(Palette.textDim),
    }).setOrigin(0.5);

    neonButton(this, 710, 596, 'BACK', () => goTo(this, 'Menu'), 230, 48, Palette.textDim);
  }
}
