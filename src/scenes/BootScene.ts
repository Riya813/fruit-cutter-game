import Phaser from 'phaser';
import { buildTextures } from '../core/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    buildTextures(this);
    this.scene.start('Menu');
  }
}
