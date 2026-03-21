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

// Initial canvas size — GameScene reconfigures this on orientation change.
const isPortrait = window.innerHeight > window.innerWidth;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  isPortrait ? 640  : 1024,
  height: isPortrait ? 1024 : 640,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [BootScene, PreloadScene, GameScene],
  scale: {
    // FIT: canvas fills the viewport at the correct aspect ratio. GameScene swaps
    // the base resolution (1024×640 ↔ 640×1024) on orientation change so that
    // portrait and landscape layouts each use their own design coordinate space.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
