/**
 * GameScene — Phaser 3 renderer. The only scene that talks to GameEngine.
 *
 * All game logic lives in GameEngine. This scene's sole job is:
 *   1. Instantiate GameEngine and ApiClient
 *   2. Call engine.loadLocalGame() or engine.loadApiGame() at game start
 *   3. Render the current GameSnapshot (cards, odds, credits, buttons)
 *   4. Forward player input (Deal, Bet, Advance) to GameEngine
 *   5. Re-render after each state change
 *
 * Equivalent to myGameState + the rendering portions of hands.js,
 * buttons.js, control.js, and amounts.js in the original JS client.
 *
 * TODO: Replace placeholder text rendering with sprite-based card/chip graphics
 *       once assets are loaded in PreloadScene.
 */
import Phaser from 'phaser';
import { GameEngine } from '../engine/GameEngine';
import { ApiClient } from '../engine/ApiClient';

const NUMBER_OF_HANDS = 4; // TODO: make configurable (3 or 4)
const INITIAL_CREDITS = 10_000;

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private api!: ApiClient;

  // Placeholder UI elements — replaced with sprites in later passes
  private statusText!: Phaser.GameObjects.Text;
  private dealButton!: Phaser.GameObjects.Text;
  private advanceButton!: Phaser.GameObjects.Text;
  private handTexts: Phaser.GameObjects.Text[] = [];
  private oddsTexts: Phaser.GameObjects.Text[] = [];
  private creditsText!: Phaser.GameObjects.Text;
  private dataSourceText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.engine = new GameEngine(NUMBER_OF_HANDS, INITIAL_CREDITS);
    this.api = new ApiClient();

    this._buildPlaceholderUI();

    // Pre-fetch so the first game starts with live data if API is available
    this.api.prefetch(NUMBER_OF_HANDS);
  }

  // ----------------------------------------------------------------
  // Placeholder UI — text-only layout matching the logical structure
  // of the original game (to be replaced with sprites/animations)
  // ----------------------------------------------------------------

  private _buildPlaceholderUI(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, 30, "Texas Hedge'Em — Reference Client", {
      fontSize: '20px', color: '#f0c040', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 70, 'Press DEAL to start', {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.dataSourceText = this.add.text(width / 2, 95, '', {
      fontSize: '11px', color: '#44aa44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Hand labels + odds placeholders
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      const x = 150 + i * 190;
      this.add.text(x, 140, `Hand ${i + 1}`, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.handTexts[i] = this.add.text(x, 200, '??', {
        fontSize: '22px', color: '#f0c040', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.oddsTexts[i] = this.add.text(x, 260, '—', {
        fontSize: '18px', color: '#44aaff', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    this.creditsText = this.add.text(20, height - 40, `Credits: ${INITIAL_CREDITS}`, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
    });

    // Deal button
    this.dealButton = this.add.text(width / 2, height - 80, '[ DEAL ]', {
      fontSize: '22px', color: '#00ff88', fontFamily: 'monospace',
      backgroundColor: '#004422', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.dealButton.on('pointerdown', () => this._onDeal());

    // Advance button (hidden until game is in progress)
    this.advanceButton = this.add.text(width / 2, height - 40, '[ ADVANCE ]', {
      fontSize: '16px', color: '#ffaa00', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    this.advanceButton.on('pointerdown', () => this._onAdvance());
  }

  // ----------------------------------------------------------------
  // Player actions — delegate to GameEngine, then re-render
  // ----------------------------------------------------------------

  private async _onDeal(): Promise<void> {
    this.dealButton.setVisible(false);
    this.statusText.setText('Dealing…');

    // Try live API first, fall back to local data
    const apiRecord = await this.api.getNextDeal(NUMBER_OF_HANDS);
    if (apiRecord) {
      this.engine.loadApiGame(apiRecord);
    } else {
      this.engine.loadLocalGame();
    }

    // Advance to hole stage immediately
    this.engine.advance();

    // Pre-fetch next deal in background
    this.api.prefetch(NUMBER_OF_HANDS);

    this._render();
    this.advanceButton.setVisible(true);
  }

  private _onAdvance(): void {
    const advanced = this.engine.advance();
    if (!advanced) return;

    this._render();

    if (this.engine.isGameOver) {
      this.engine.resolveBets();
      this.advanceButton.setVisible(false);
      this.dealButton.setVisible(true);
      this.statusText.setText('Game over — press DEAL for next hand');
      this._renderCredits();
    }
  }

  // ----------------------------------------------------------------
  // Rendering — reads GameSnapshot and updates text objects
  // ----------------------------------------------------------------

  private _render(): void {
    const snap = this.engine.snapshot();
    const stageNames = ['—', 'HOLE', 'FLOP', 'TURN', 'RIVER'];

    this.statusText.setText(`Stage: ${stageNames[snap.dealStatus + 1] ?? '?'}`);
    this.dataSourceText.setText(snap.isLiveData ? '● Live data (API)' : '○ Local data (coredata)');

    for (let i = 0; i < snap.numberOfHands; i++) {
      const hand = snap.dealStatus >= 0 ? this.engine.getRecord().hands[i] : '??';
      this.handTexts[i]?.setText(hand);

      const info = snap.handStageInfo[i];
      if (info) {
        if (this.engine.isHandDead(i)) {
          this.oddsTexts[i]?.setText('DEAD').setColor('#ff4444');
        } else if (this.engine.isHandWinner(i)) {
          this.oddsTexts[i]?.setText('WINNER').setColor('#00ff88');
        } else {
          this.oddsTexts[i]?.setText(`x${info.oddsRounded.toFixed(1)}`).setColor('#44aaff');
        }
      }
    }

    this._renderCredits();
  }

  private _renderCredits(): void {
    this.creditsText.setText(`Credits: ${this.engine.getCredits().toFixed(2)}`);
  }
}
