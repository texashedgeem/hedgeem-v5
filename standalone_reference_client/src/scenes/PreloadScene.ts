/**
 * PreloadScene — loads all game assets before the game starts.
 * Equivalent to myPreloadState in the original JS client.
 *
 * TODO: load card spritesheet, table background, chip images, sounds.
 * Assets should be copied from HedgeEmJavaScriptClient/odobo/src/images/
 * into standalone_reference_client/src/assets/
 */
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // TODO: this.load.spritesheet('cards', 'cards_hedgeem_blue.png', { frameWidth: 98, frameHeight: 128 });
    // TODO: this.load.image('table', 'table_mobile.png');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
