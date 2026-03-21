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
    // FIT: scales the 1024×640 canvas to fill the viewport while maintaining aspect ratio.
    // All game coordinates stay in the 1024×640 design space; input and rendering are exact.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
