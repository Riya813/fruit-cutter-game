import Phaser from 'phaser';
import { neonButton, title } from '../core/Ui';
import { Palette, GAME_WIDTH, GAME_HEIGHT } from '../core/Palette';
import { Audio } from '../core/AudioManager';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create(data: { level: number; mode?: string }) {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    title(this, GAME_WIDTH / 2, 170, 'PAUSED', 52);

    const resume = () => {
      this.scene.stop();
      this.scene.resume('Game');
    };

    neonButton(this, GAME_WIDTH / 2, 280, 'RESUME', resume, 260, 56, Palette.good);
    neonButton(this, GAME_WIDTH / 2, 355, 'RESTART LEVEL', () => {
      this.scene.stop();
      const game = this.scene.get('Game');
      game.scene.restart({ level: data.level, retries: 1, mode: data.mode ?? 'campaign' });
    }, 260, 56, Palette.secondary);
    neonButton(this, GAME_WIDTH / 2, 430, 'QUIT TO LEVELS', () => {
      this.scene.stop('Game');
      this.scene.start('LevelSelect');
    }, 260, 56, Palette.textDim);

    const muteBtn = neonButton(this, GAME_WIDTH / 2, 505, Audio.muted ? 'SOUND: OFF' : 'SOUND: ON', () => {
      const m = Audio.toggleMute();
      (muteBtn.list[2] as Phaser.GameObjects.Text).setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    }, 260, 48, Palette.textDim);

    this.input.keyboard?.on('keydown-ESC', resume);
  }
}
