/**
 * main.ts — Phaser 3 game entry point.
 *
 * Boots the game with the BootScene → PreloadScene → GameScene pipeline,
 * mirroring the Boot → Preload → Game state machine in the original JS client.
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 640,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [BootScene, PreloadScene, GameScene],
  scale: {
    // EXPAND: canvas fills the viewport without black bars, revealing more table artwork.
    // The 1024×640 coordinate space remains; Phaser expands the visible area to fill.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
