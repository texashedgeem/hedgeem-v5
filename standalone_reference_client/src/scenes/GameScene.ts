/**
 * GameScene — Phaser 3 renderer. The only scene that talks to GameEngine.
 *
 * All game logic lives in GameEngine. This scene's sole job is:
 *   1. Instantiate GameEngine and ApiClient
 *   2. Call engine.loadLocalGame() or engine.loadApiGame() at game start
 *   3. Render the current GameSnapshot (cards, odds, credits, buttons)
 *   4. Forward player input (Deal, Advance) to GameEngine
 *   5. Re-render after each state change
 *
 * Card spritesheet frame formula: frame = 4 * rank + suit
 *   suit: 0=clubs 1=diamonds 2=hearts 3=spades
 *   frame 52 = card back
 */
import Phaser from 'phaser';
import { GameEngine } from '../engine/GameEngine';
import { ApiClient } from '../engine/ApiClient';

const NUMBER_OF_HANDS = 4;
const INITIAL_CREDITS = 10_000;

// Card display size (scaled from 98×128 source)
const CARD_W = 71;
const CARD_H = 100;

// Tint values matching the original JS client
const TINT_LIVE   = 0xffffff;
const TINT_DEAD   = 0x7f7f7f;
const TINT_WINNER = 0xffe040;

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private api!: ApiClient;

  // Sprites
  private imgCard: Phaser.GameObjects.Sprite[] = [];
  private imgHand: Phaser.GameObjects.Image[] = [];
  private imgDeadHand: Phaser.GameObjects.Image[] = [];
  private dealBtn!: Phaser.GameObjects.Image;
  private advanceBtn!: Phaser.GameObjects.Text;

  // Text overlays
  private oddsTexts: Phaser.GameObjects.Text[] = [];
  private handDescTexts: Phaser.GameObjects.Text[] = [];
  private creditsText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private dataSourceText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.engine = new GameEngine(NUMBER_OF_HANDS, INITIAL_CREDITS);
    this.api = new ApiClient();

    this._buildUI();
    this.api.prefetch(NUMBER_OF_HANDS);
  }

  // ----------------------------------------------------------------
  // UI construction
  // ----------------------------------------------------------------

  private _buildUI(): void {
    const { width, height } = this.scale;

    // Table background
    this.add.image(width / 2, height / 2, 'table').setDisplaySize(width, height);

    // Hand panel images (one per hand) — positioned across the lower half
    const handPanelY = 390;
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      const x = this._handCentreX(i);
      this.imgHand[i] = this.add.image(x, handPanelY, `hand${i + 1}`).setVisible(false);

      // Dead hand skull overlay
      this.imgDeadHand[i] = this.add.image(x, handPanelY, 'deadhand')
        .setVisible(false).setDepth(2);

      // Odds text (over hand panel)
      this.oddsTexts[i] = this.add.text(x, handPanelY - 10, '', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3).setVisible(false);

      // Hand description (below odds)
      this.handDescTexts[i] = this.add.text(x, handPanelY + 22, '', {
        fontSize: '11px', color: '#ffe080', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(3).setVisible(false);
    }

    // 13 card sprites: cards 0-7 = hole cards (2 per hand), 8-12 = community
    for (let c = 0; c < 13; c++) {
      const sprite = this.add.sprite(0, 0, 'cards', 52)
        .setDisplaySize(CARD_W, CARD_H)
        .setVisible(false)
        .setDepth(1);
      this.imgCard[c] = sprite;
    }

    // Community card positions (centred, landscape)
    const communityY = 230;
    const communityXs = [310, 400, 490, 580, 670];
    for (let c = 0; c < 5; c++) {
      this.imgCard[8 + c].setPosition(communityXs[c], communityY);
    }

    // Deal button
    this.dealBtn = this.add.image(width / 2, height - 60, 'dealbutton')
      .setDisplaySize(90, 90)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);
    this.dealBtn.on('pointerdown', () => this._onDeal());
    this.dealBtn.on('pointerover', () => this.dealBtn.setTint(0xddddff));
    this.dealBtn.on('pointerout',  () => this.dealBtn.clearTint());

    // Advance button (text — sits next to deal area)
    this.advanceBtn = this.add.text(width / 2, height - 28, '▶  ADVANCE', {
      fontSize: '15px', color: '#ffcc00', fontFamily: 'monospace',
      backgroundColor: '#333300', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(4);
    this.advanceBtn.on('pointerdown', () => this._onAdvance());

    // Credits
    this.creditsText = this.add.text(14, height - 22, `Credits: ${INITIAL_CREDITS}`, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setDepth(4);

    // Status + data source
    this.statusText = this.add.text(width / 2, 18, "Texas Hedge'Em", {
      fontSize: '16px', color: '#f0c040', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);

    this.dataSourceText = this.add.text(width - 10, height - 22, '', {
      fontSize: '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(4);
  }

  // ----------------------------------------------------------------
  // Player actions
  // ----------------------------------------------------------------

  private async _onDeal(): Promise<void> {
    this.dealBtn.setVisible(false);
    this.advanceBtn.setVisible(false);
    this.statusText.setText('Dealing…');

    const apiRecord = await this.api.getNextDeal(NUMBER_OF_HANDS);
    if (apiRecord) {
      this.engine.loadApiGame(apiRecord);
    } else {
      this.engine.loadLocalGame();
    }

    this.engine.advance(); // → hole stage
    this.api.prefetch(NUMBER_OF_HANDS);

    this._render();
    this.advanceBtn.setVisible(true);
  }

  private _onAdvance(): void {
    const advanced = this.engine.advance();
    if (!advanced) return;

    this._render();

    if (this.engine.isGameOver) {
      this.engine.resolveBets();
      this.advanceBtn.setVisible(false);
      this.dealBtn.setVisible(true);
      this.statusText.setText('Game Over — press DEAL');
      this._renderCredits();
    }
  }

  // ----------------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------------

  private _render(): void {
    const snap = this.engine.snapshot();
    const stageNames = ['HOLE', 'FLOP', 'TURN', 'RIVER'];
    this.statusText.setText(stageNames[snap.dealStatus] ?? 'DEAL');
    this.dataSourceText.setText(snap.isLiveData ? '● API' : '○ Local');

    this._renderCards(snap.dealStatus);
    this._renderHandPanels(snap);
    this._renderCredits();
  }

  private _renderCards(dealStatus: number): void {
    const cards = this.engine.getCardData();

    // Hole cards — reveal all 8 immediately at hole stage
    for (let c = 0; c < NUMBER_OF_HANDS * 2; c++) {
      const hand = Math.floor(c / 2);
      const cardInHand = c % 2;
      const x = this._handCentreX(hand) + (cardInHand === 0 ? -20 : 20);
      const y = 310;

      const sprite = this.imgCard[c];
      sprite.setPosition(x, y).setVisible(true);
      sprite.setFrame(4 * cards[c].rank + cards[c].suit);

      // Tint dead hands
      if (dealStatus >= 1 && this.engine.isHandDead(hand)) {
        sprite.setTint(TINT_DEAD);
      } else if (dealStatus === 3 && this.engine.isHandWinner(hand)) {
        sprite.setTint(TINT_WINNER);
      } else {
        sprite.setTint(TINT_LIVE);
      }
    }

    // Community cards — reveal progressively
    const communityReveal = [0, 3, 1, 1]; // hole:0, flop:3, turn:1, river:1
    let revealed = 0;
    for (let s = 0; s <= dealStatus; s++) revealed += communityReveal[s];

    for (let c = 0; c < 5; c++) {
      const sprite = this.imgCard[8 + c];
      if (c < revealed) {
        sprite.setFrame(4 * cards[8 + c].rank + cards[8 + c].suit)
              .setTint(TINT_LIVE)
              .setVisible(true);
      } else {
        sprite.setVisible(false);
      }
    }
  }

  private _renderHandPanels(snap: ReturnType<GameEngine['snapshot']>): void {
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      this.imgHand[i].setVisible(true);

      const info = snap.handStageInfo[i];
      const dead   = this.engine.isHandDead(i);
      const winner = this.engine.isHandWinner(i);

      this.imgDeadHand[i].setVisible(dead);

      this.oddsTexts[i].setVisible(true);
      this.handDescTexts[i].setVisible(true);

      if (winner) {
        this.oddsTexts[i].setText('WINNER').setColor('#00ff88');
        this.handDescTexts[i].setText(info?.handDescShort ?? '');
      } else if (dead) {
        this.oddsTexts[i].setText('DEAD').setColor('#ff4444');
        this.handDescTexts[i].setText('');
      } else if (info) {
        this.oddsTexts[i].setText(`×${info.oddsRounded.toFixed(1)}`).setColor('#ffffff');
        this.handDescTexts[i].setText(info.handDescShort);
      }
    }
  }

  private _renderCredits(): void {
    this.creditsText.setText(`Credits: ${this.engine.getCredits().toFixed(0)}`);
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  /** Horizontal centre of hand i, evenly spaced across the canvas */
  private _handCentreX(i: number): number {
    const { width } = this.scale;
    const spacing = width / (NUMBER_OF_HANDS + 1);
    return spacing * (i + 1);
  }
}
