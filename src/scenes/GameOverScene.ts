import Phaser from 'phaser';
import { drawBackground, title, label, neonButton, starRow, tickScore, goTo } from '../core/Ui';
import { Palette, Fonts, hex, GAME_WIDTH } from '../core/Palette';
import { Save } from '../core/SaveManager';

interface ResultData {
  mode: 'campaign' | 'endless' | 'daily';
  won: boolean; level: number; score: number; stars: number; retries: number;
  record?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: ResultData) {
    drawBackground(this);
    this.cameras.main.fadeIn(200, 18, 8, 31);

    const heading =
      data.mode === 'endless' ? (data.record ? 'NEW RECORD!' : 'RUN OVER') :
      data.mode === 'daily' ? (data.record ? 'NEW DAILY BEST!' : 'DAILY DONE') :
      data.won ? 'LEVEL CLEAR!' : 'GAME OVER';
    title(this, GAME_WIDTH / 2, 120, heading, 54);

    const scoreText = this.add.text(GAME_WIDTH / 2, 210, '0', {
      fontFamily: Fonts.display, fontSize: '46px', color: hex(Palette.white),
    }).setOrigin(0.5).setShadow(0, 0, hex(Palette.secondary), 14, true, true);
    tickScore(this, scoreText, data.score);

    if (data.mode === 'endless') {
      label(this, GAME_WIDTH / 2, 258, `Best run: ${Save.endlessBest}`, 17);
      label(this, GAME_WIDTH / 2, 320,
        data.record ? 'The storm bows to you.' : 'The difficulty never stops climbing. Neither should you.',
        18, data.record ? Palette.accent : Palette.textDim);
    } else if (data.mode === 'daily') {
      label(this, GAME_WIDTH / 2, 258, `Today's best: ${Save.dailyBest()}`, 17);
      label(this, GAME_WIDTH / 2, 320,
        'Everyone gets the same fruit today — same seed, same storm. New challenge at midnight UTC.',
        16);
    } else {
      const rec = Save.record(data.level);
      label(this, GAME_WIDTH / 2, 258, `Best: ${rec.bestScore}${rec.bestTime ? ` · Fastest clear: ${rec.bestTime.toFixed(1)}s` : ''}`, 17);
      if (data.won) {
        starRow(this, GAME_WIDTH / 2, 320, data.stars, 34, true);
        if (data.stars < 3) {
          label(this, GAME_WIDTH / 2, 372,
            data.retries > 0 ? 'Clear without retries for more stars' : 'Beat PAR score for 3 stars', 15);
        }
      } else {
        label(this, GAME_WIDTH / 2, 320, 'Streak broken — one more try?', 19, Palette.primary);
      }
    }

    // Quick restart is the primary action: instant, keeps the itch alive.
    const retryLabel = data.mode === 'endless' ? 'ONE MORE RUN (R)'
      : data.mode === 'daily' ? 'RETRY DAILY (R)'
      : data.won ? 'RETRY (R)' : 'ONE MORE TRY (R)';
    neonButton(this, GAME_WIDTH / 2, 440, retryLabel,
      () => this.retry(data), 280, 58, data.won || data.record ? Palette.secondary : Palette.primary);

    const isNextable = data.mode === 'campaign' && data.won && data.level < 10;
    if (isNextable) {
      neonButton(this, GAME_WIDTH / 2, 515, 'NEXT LEVEL →', () =>
        goTo(this, 'Game', { level: data.level + 1 }), 280, 58, Palette.good);
    }

    neonButton(this, GAME_WIDTH / 2, isNextable ? 590 : 515, 'LEVEL SELECT', () =>
      goTo(this, 'LevelSelect'), 280, 48, Palette.textDim);

    this.input.keyboard?.on('keydown-R', () => this.retry(data));
    if (isNextable) {
      this.input.keyboard?.on('keydown-ENTER', () => goTo(this, 'Game', { level: data.level + 1 }));
      label(this, GAME_WIDTH / 2, 630, 'Enter = next level', 14);
    }
  }

  private retry(data: ResultData) {
    // No fade — sub-0.5s back into play.
    if (data.mode !== 'campaign') {
      this.scene.start('Game', { mode: data.mode, retries: data.retries + 1 });
    } else {
      this.scene.start('Game', { level: data.level, retries: data.won ? 0 : data.retries + 1 });
    }
  }
}
