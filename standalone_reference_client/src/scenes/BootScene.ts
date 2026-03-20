/**
 * BootScene — minimal boot, transitions immediately to PreloadScene.
 * Equivalent to myBootState in the original JS client.
 */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
