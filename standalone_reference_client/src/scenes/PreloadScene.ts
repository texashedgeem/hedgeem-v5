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
    // Landscape table (1385×1385): standard HedgeEm blue — matches JS client (tablel_hedgeem_blue.png).
    // JS client uses this same image regardless of hand count; N-handed mode just renders N of the 4 pockets.
    this.load.image('table', 'tablel_hedgeem_blue.png');
    // Portrait table (1385×1385): same brand, portrait-orientation oval table
    this.load.image('tablep', 'tablep_hedgeem_blue.png');
    // dealbutton.png is a 256×256 spritesheet: 2×2 grid of 128×128 frames (normal/hover/pressed/dim)
    // Must load as spritesheet and use frame 0, NOT as plain image (shows all 4 frames)
    this.load.spritesheet('dealbutton', 'dealbutton.png', { frameWidth: 128, frameHeight: 128 });
    this.load.image('hand1', 'hand1.png');
    this.load.image('hand2', 'hand2.png');
    this.load.image('hand3', 'hand3.png');
    this.load.image('hand4', 'hand4.png');
    // deadhand.png (not deadhand_skull) matches JS client asset
    this.load.image('deadhand', 'deadhand.png');
    this.load.image('cantlose', 'cantlose.png');
    this.load.image('chips', 'chips.png');
    // Bitmap font used by JS client for odds multiplier display
    this.load.bitmapFont('handfont', 'handfont.png', 'handfont.xml');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
