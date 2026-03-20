/**
 * PreloadScene — loads all game assets before the game starts.
 * Equivalent to myPreloadState in the original JS client.
 *
 * Card spritesheet: frame = 4 * rank + suit  (suit: 0=clubs 1=diamonds 2=hearts 3=spades)
 *                   frame 52 = card back
 */
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Card spritesheet: 980×768, 98×128 per frame, 10 cols × 6 rows = 60 frames (52 cards + back at 52)
    // cards_orange.png = default brand (BRAND="" in JS client, live at hedgeem.qeetoto.com)
    this.load.spritesheet('cards', 'cards_orange.png', { frameWidth: 98, frameHeight: 128 });
    // tablel_hedgeem_blue.png = 1384×1385 — centred on 1024×640 canvas, crops to fit (matches JS client)
    this.load.image('table', 'tablel_hedgeem_blue.png');
    this.load.image('dealbutton', 'dealbutton.png');
    this.load.image('hand1', 'hand1.png');
    this.load.image('hand2', 'hand2.png');
    this.load.image('hand3', 'hand3.png');
    this.load.image('hand4', 'hand4.png');
    // deadhand.png (not deadhand_skull) matches JS client asset
    this.load.image('deadhand', 'deadhand.png');
    this.load.image('cantlose', 'cantlose.png');
    this.load.image('chips', 'chips.png');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
