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

// Default to 3-handed (matches JS client default/live config). Change to 4 for four-handed mode.
const NUMBER_OF_HANDS = 3;
// Starting credits £100.00 — stored as pence (10000p) for integer arithmetic, displayed as £x.xx
const INITIAL_CREDITS = 10_000;

// Card display size (scaled from 98×128 source)
const CARD_W = 71;
const CARD_H = 100;

// Tint values matching the original JS client
const TINT_LIVE = 0xffffff;
const TINT_DEAD = 0x7f7f7f;

// Exact felt positions sourced from HedgeEmJavaScriptClient/odobo/src/js/hands.js
// Non-mobile landscape theme (the live site at hedgeem.qeetoto.com).
// Hole cards: cards 1-8 (1-indexed JS), mapped to imgCard[0-7] (0-indexed here).
// Community cards 9-13 → imgCard[8-12]. SkewX is the Phaser 2 3D effect — applied in HEDGE-73.
const CARD_POSITIONS = [
  // Hand 1
  { x: 287, y: 329, angle:  8 },   // imgCard[0]
  { x: 323, y: 334, angle:  8 },   // imgCard[1]
  // Hand 2
  { x: 422, y: 345, angle:  3.5 }, // imgCard[2]
  { x: 460, y: 347, angle:  3.5 }, // imgCard[3]
  // Hand 3
  { x: 564, y: 347, angle: -3.5 }, // imgCard[4]
  { x: 602, y: 345, angle: -3.5 }, // imgCard[5]
  // Hand 4 (hidden in 3-handed mode)
  { x: 701, y: 334, angle: -8 },   // imgCard[6]
  { x: 738, y: 329, angle: -8 },   // imgCard[7]
  // Community cards (flop/turn/river) — smaller (67×83), no angle
  { x: 333, y: 157, angle: 0 },    // imgCard[8]  flop 1
  { x: 404, y: 157, angle: 0 },    // imgCard[9]  flop 2
  { x: 476, y: 157, angle: 0 },    // imgCard[10] flop 3
  { x: 584, y: 157, angle: 0 },    // imgCard[11] turn
  { x: 691, y: 157, angle: 0 },    // imgCard[12] river
];

// Hand panel centre positions (landscape, from handPosition non-mobile landscape in hands.js)
const HAND_POSITIONS = [
  { x: 304, y: 331 }, // hand 1
  { x: 440, y: 346 }, // hand 2
  { x: 584, y: 346 }, // hand 3
  { x: 725, y: 331 }, // hand 4 (hidden in 3-handed mode)
];

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private api!: ApiClient;

  // Sprites
  private imgCard: Phaser.GameObjects.Sprite[] = [];
  private imgHand: Phaser.GameObjects.Image[] = [];
  private imgDeadHand: Phaser.GameObjects.Image[] = [];
  private dealBtn!: Phaser.GameObjects.Sprite;
  private advanceBtn!: Phaser.GameObjects.Sprite;

  // Text overlays
  // NOTE: Previously BitmapText (handfont) — switched to Text because handfont lacks W/I/N/D/E/A
  // characters needed for WIN/DEAD labels. HEDGE-84 tracks restoring proper bitmap font styling.
  private oddsTexts: Phaser.GameObjects.Text[] = [];
  private handDescTexts: Phaser.GameObjects.Text[] = [];
  private creditsText!: Phaser.GameObjects.Text;
  private totalBetText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private dataSourceText!: Phaser.GameObjects.Text;

  // Debug mode: activated via ?debug=1 in the URL. Shows stage labels, data source, diagnostics.
  private readonly debugMode: boolean = new URLSearchParams(window.location.search).has('debug');

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.engine = new GameEngine(NUMBER_OF_HANDS, INITIAL_CREDITS);
    this.api = new ApiClient();

    this._buildUI();
    // API prefetch disabled — data source is in-app coredata by default.
    // Enable via the config options page when HEDGE-82 / HEDGE-83 are implemented.
    // this.api.prefetch(NUMBER_OF_HANDS);
  }

  // ----------------------------------------------------------------
  // UI construction
  // ----------------------------------------------------------------

  private _buildUI(): void {
    const { width, height } = this.scale;

    // Table background: 1384×1385 image centred at (512,320) — larger than canvas so it crops,
    // matching how the JS client renders tablel_hedgeem_blue.png (no scaling, anchor 0.5).
    this.add.image(512, 320, 'table');

    // Hand panel images — exact felt positions from JS client handPosition landscape
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      const { x, y } = HAND_POSITIONS[i];
      this.imgHand[i] = this.add.image(x, y, `hand${i + 1}`).setVisible(false);

      // Dead hand skull overlay — same position as hand panel
      this.imgDeadHand[i] = this.add.image(x, y, 'deadhand')
        .setVisible(false).setDepth(2);

      // Odds text — bold white, positioned above hand panel.
      // Uses regular Text (not BitmapText) because handfont lacks letters needed for WIN/DEAD.
      // HEDGE-84: restore handfont bitmap styling once a font with full charset is sourced.
      this.oddsTexts[i] = this.add.text(x, y - 35, '', {
        fontSize: '36px', color: '#ffffff', fontFamily: 'Arial Black, sans-serif',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(3).setVisible(false);

      // Hand description (below odds) — disabled pending HEDGE-85 config option.
      // Re-enable by restoring setVisible(true) in _renderHandPanels when config flag is added.
      this.handDescTexts[i] = this.add.text(x, y + 22, '', {
        fontSize: '11px', color: '#ffe080', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(3).setVisible(false);
    }

    // 13 card sprites: cards 0-7 = hole cards (2 per hand), 8-12 = community
    // Positioned at their felt positions immediately; community cards are smaller (67×83)
    for (let c = 0; c < 13; c++) {
      const pos = CARD_POSITIONS[c];
      const w = c >= 8 ? 67 : CARD_W;
      const h = c >= 8 ? 83 : CARD_H;
      const sprite = this.add.sprite(pos.x, pos.y, 'cards', 52)
        .setDisplaySize(w, h)
        .setAngle(pos.angle)
        .setVisible(false)
        .setDepth(1);
      this.imgCard[c] = sprite;
    }

    // Deal button — frame 0 of spritesheet (256×256 = 2×2 grid of 128×128 frames)
    // Right side, lower — matches JS client landscape: x=960, y=520 on 1024×640
    this.dealBtn = this.add.sprite(960, 520, 'dealbutton', 0)
      .setDisplaySize(90, 90)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);
    this.dealBtn.on('pointerdown', () => this._onDeal());
    this.dealBtn.on('pointerover', () => this.dealBtn.setTint(0xddddff));
    this.dealBtn.on('pointerout',  () => this.dealBtn.clearTint());

    // Advance button — right side, mid — matches JS client buttonRight landscape: x=874, y=290
    // Uses frame 0 of dealbutton spritesheet with green tint as placeholder (rightbutton.png not yet sourced)
    this.advanceBtn = this.add.sprite(874, 290, 'dealbutton', 0)
      .setDisplaySize(90, 90)
      .setTint(0x40c040)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(4);
    this.advanceBtn.on('pointerdown', () => this._onAdvance());
    this.advanceBtn.on('pointerover', () => this.advanceBtn.setTint(0x80ff80));
    this.advanceBtn.on('pointerout',  () => this.advanceBtn.setTint(0x40c040));

    // Bottom bar — Credits / Total Bet / Win (large, £x.xx format)
    const barY = height - 18;
    const labelStyle = { fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace' };
    const valueStyle = { fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2 };

    this.add.text(80,       barY - 14, 'CREDITS',   labelStyle).setOrigin(0.5).setDepth(4);
    this.add.text(width / 2, barY - 14, 'TOTAL BET', labelStyle).setOrigin(0.5).setDepth(4);
    this.add.text(width - 80, barY - 14, 'WIN',      labelStyle).setOrigin(0.5).setDepth(4);

    this.creditsText  = this.add.text(80,       barY, `£${(INITIAL_CREDITS / 100).toFixed(2)}`, valueStyle).setOrigin(0.5).setDepth(4);
    this.totalBetText = this.add.text(width / 2, barY, '£0.00', valueStyle).setOrigin(0.5).setDepth(4);
    this.winText      = this.add.text(width - 80, barY, '£0.00', valueStyle).setOrigin(0.5).setDepth(4);

    // Status + data source — debug mode only (?debug=1)
    this.statusText = this.add.text(width / 2, 18, "Texas Hedge'Em", {
      fontSize: '16px', color: '#f0c040', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4).setVisible(this.debugMode);

    this.dataSourceText = this.add.text(width - 10, 8, '', {
      fontSize: '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(4).setVisible(this.debugMode);
  }

  // ----------------------------------------------------------------
  // Player actions
  // ----------------------------------------------------------------

  private async _onDeal(): Promise<void> {
    this.dealBtn.setVisible(false);
    this.advanceBtn.setVisible(false);
    this.statusText.setText('Dealing…');

    // Always use local coredata — API data source disabled until HEDGE-83 config option lands.
    this.engine.loadLocalGame();
    // this.api.prefetch(NUMBER_OF_HANDS); — also disabled

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
      if (this.debugMode) this.statusText.setText('Game Over — press DEAL');
      // Re-render after resolveBets so WINNER/DEAD states are shown
      this._render();
    }
  }

  // ----------------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------------

  private _render(): void {
    const snap = this.engine.snapshot();
    if (this.debugMode) {
      const stageNames = ['HOLE', 'FLOP', 'TURN', 'RIVER'];
      this.statusText.setText(stageNames[snap.dealStatus] ?? 'DEAL');
      this.dataSourceText.setText(snap.isLiveData ? '● API' : '○ Local');
    }

    this._renderCards(snap.dealStatus);
    this._renderHandPanels(snap);
    this._renderCredits();
  }

  private _renderCards(dealStatus: number): void {
    const cards = this.engine.getCardData();
    const nHands = this.engine.getNumberOfHands();

    for (let c = 0; c < nHands * 2; c++) {
      const hand = Math.floor(c / 2);
      const sprite = this.imgCard[c];
      // Position already set from CARD_POSITIONS in _buildUI — just show the card
      sprite.setVisible(true);

      // JS client: only Hand 1 (index 0) is revealed face-up at hole stage.
      // All other hands show card back until they are dealt in subsequent states.
      // For now (no dealing animation) we reveal hand 1 at hole, all hands from flop onward.
      const faceUp = hand === 0 || dealStatus >= 1;

      if (faceUp) {
        sprite.setFrame(4 * cards[c].rank + cards[c].suit);
        // Dead cards: grey tint (matches JS client CC_DEAD_CARD = 0x7f7f7f)
        if (dealStatus >= 1 && this.engine.isHandDead(hand)) {
          sprite.setTint(TINT_DEAD);
        } else if (dealStatus === 3 && this.engine.isHandWinner(hand)) {
          sprite.setTint(TINT_LIVE); // JS client keeps winners at full white, not gold
        } else {
          sprite.setTint(TINT_LIVE);
        }
      } else {
        sprite.setFrame(52); // card back
        sprite.setTint(TINT_LIVE);
      }
    }

    // Hide unused card sprites for 3-handed mode (cards 6 & 7 = hand 4 hole cards)
    for (let c = nHands * 2; c < 8; c++) {
      this.imgCard[c].setVisible(false);
    }

    // Community cards: face-down at hole stage, revealed progressively from flop
    // hole:0 revealed, flop:3, turn:+1, river:+1
    const communityReveal = [0, 3, 1, 1];
    let revealed = 0;
    for (let s = 0; s <= dealStatus; s++) revealed += communityReveal[s];

    for (let c = 0; c < 5; c++) {
      const sprite = this.imgCard[8 + c];
      // Position/angle already set from CARD_POSITIONS — just update frame visibility
      if (c < revealed) {
        sprite.setFrame(4 * cards[8 + c].rank + cards[8 + c].suit).setTint(TINT_LIVE).setVisible(true);
      } else {
        // Not yet revealed (or hole stage) — show face-down card back
        sprite.setFrame(52).setTint(TINT_LIVE).setVisible(true);
      }
    }
  }

  private _renderHandPanels(snap: ReturnType<GameEngine['snapshot']>): void {
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      this.imgHand[i].setVisible(true);

      const info = snap.handStageInfo[i];
      const dead   = this.engine.isHandDead(i);
      // Only show WIN at game-over — statusIsWinner:true in coredata is a mid-game prediction,
      // not the result. Showing it mid-game would spoil the outcome before river.
      const winner = this.engine.isGameOver && this.engine.isHandWinner(i);

      this.imgDeadHand[i].setVisible(dead);

      this.oddsTexts[i].setVisible(true);
      // HEDGE-85: hand descriptions hidden pending config option — restore setVisible(true) when implemented
      // this.handDescTexts[i].setVisible(true);

      if (winner) {
        this.oddsTexts[i].setText('WIN').setColor('#00ff88');
        // this.handDescTexts[i].setText(info?.handDescShort ?? '');  // HEDGE-85
      } else if (dead) {
        this.oddsTexts[i].setText('').setColor('#ffffff'); // skull image handles DEAD display
        // this.handDescTexts[i].setText('');  // HEDGE-85
      } else if (info) {
        this.oddsTexts[i].setText(`x${info.oddsRounded.toFixed(1)}`).setColor('#ffffff');
        // this.handDescTexts[i].setText(info.handDescShort);  // HEDGE-85
      }
    }
  }

  private _renderCredits(): void {
    this.creditsText.setText(this._pence(this.engine.getCredits()));
    // Total Bet and Win will be populated once HEDGE-50 betting is implemented
    this.totalBetText.setText(this._pence(0));
    this.winText.setText(this._pence(0));
  }

  /** Format pence value as £x.xx */
  private _pence(p: number): string {
    return `£${(p / 100).toFixed(2)}`;
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

}
