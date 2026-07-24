import Phaser from 'phaser';
import { drawBackground, title, neonButton, starRow, goTo } from '../core/Ui';
import { Palette, Fonts, hex, GAME_WIDTH } from '../core/Palette';
import { LEVELS, WORLD_NAMES } from '../config/levels';
import { Save } from '../core/SaveManager';
import { Audio } from '../core/AudioManager';

/** 40 levels shown as four world pages of 10 (5×2 cards). */
export class LevelSelectScene extends Phaser.Scene {
  private page = 0;

  constructor() { super('LevelSelect'); }

  create(data: { page?: number }) {
    // Default to the world containing the player's frontier level.
    this.page = data.page ?? Math.floor((Math.min(Save.unlocked, 40) - 1) / 10);
    drawBackground(this);
    this.cameras.main.fadeIn(250, 34, 28, 51);

    title(this, GAME_WIDTH / 2, 56, `WORLD ${this.page + 1} · ${WORLD_NAMES[this.page].toUpperCase()}`, 34);

    // Page dots under the header.
    for (let i = 0; i < 4; i++) {
      this.add.circle(GAME_WIDTH / 2 - 33 + i * 22, 96, 5,
        i === this.page ? Palette.accent : 0x4a3c66);
    }

    // Page arrows flank the header.
    if (this.page > 0) {
      neonButton(this, 90, 60, '◀', () => this.scene.restart({ page: this.page - 1 }), 64, 52, Palette.textDim, 22);
    }
    if (this.page < 3) {
      neonButton(this, GAME_WIDTH - 90, 60, '▶', () => this.scene.restart({ page: this.page + 1 }), 64, 52, Palette.textDim, 22);
    }

    const cols = 5, cardW = 158, cardH = 176, gapX = 24, gapY = 26;
    const startX = (GAME_WIDTH - (cols * cardW + (cols - 1) * gapX)) / 2 + cardW / 2;
    const startY = 208;

    LEVELS.slice(this.page * 10, this.page * 10 + 10).forEach((lvl, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const unlocked = lvl.id <= Save.unlocked;
      const rec = Save.record(lvl.id);

      const card = this.add.container(x, y);
      const isBoss = lvl.id % 10 === 0;
      const borderColor = isBoss ? Palette.accent : unlocked ? Palette.secondary : 0x4a3c66;
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x000000, unlocked ? 0.4 : 0.6)
        .setStrokeStyle(3, borderColor, 1);
      card.add(bg);

      card.add(this.add.text(0, -62, `${lvl.id}`, {
        fontFamily: Fonts.display, fontSize: '38px',
        color: unlocked ? hex(Palette.white) : '#5a4a7e',
      }).setOrigin(0.5));

      card.add(this.add.text(0, -26, unlocked ? lvl.name : 'LOCKED', {
        fontFamily: Fonts.body, fontSize: '13px',
        color: unlocked ? hex(Palette.secondary) : '#5a4a7e',
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
        const lock = this.add.container(0, 30);
        lock.add(this.add.rectangle(0, 6, 26, 20, 0x4a3c66));
        lock.add(this.add.arc(0, -6, 9, 180, 360, false).setStrokeStyle(4, 0x4a3c66).setClosePath(false));
        card.add(lock);
      }

      card.setAlpha(0).setY(y + 24);
      this.tweens.add({
        targets: card, alpha: 1, y, delay: i * 45, duration: 300, ease: 'Cubic.easeOut',
      });
    });

    // Special modes row.
    const endlessOpen = Save.endlessUnlocked;
    const endlessBtn = neonButton(this, 250, 610,
      endlessOpen ? 'ENDLESS' : 'ENDLESS 🔒', () => {
        if (!endlessOpen) {
          this.cameras.main.shake(120, 0.004);
          return;
        }
        Audio.start();
        goTo(this, 'Game', { mode: 'endless' });
      }, 210, 44, endlessOpen ? Palette.primary : 0x4a3c66, 18);
    if (!endlessOpen) endlessBtn.setAlpha(0.7);

    neonButton(this, 480, 610, 'DAILY', () => {
      Audio.start();
      goTo(this, 'Game', { mode: 'daily' });
    }, 210, 44, Palette.accent, 18);

    neonButton(this, 710, 610, 'BACK', () => goTo(this, 'Menu'), 210, 44, Palette.textDim, 18);
  }
}
