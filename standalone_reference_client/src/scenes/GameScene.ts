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

// Card display size — hole cards use mobile theme (CARD_SCALE_FACTOR=1.5, live JS client)
// Community cards use desktop theme sizes (67×83): they sit at the "far" end of the table
// and should appear smaller than hole cards. Without skewX perspective (HEDGE-73) they look
// flat and as wide as hole cards if given the same size — using desktop sizes as interim fix.
const CARD_W = 107;   // hole: 71 × 1.5
const CARD_H = 150;   // hole: 100 × 1.5
// Community cards — JS client: 71×100 × CARD_SCALE_FACTOR(1.5) × COMMUNITY_CARDS_3D_PERSPECTIVE_SCALING_REDUCTION(0.845)
const COMM_W = 90;   // 71 × 1.5 × 0.845 ≈ 90
const COMM_H = 127;  // 100 × 1.5 × 0.845 ≈ 127
// skewX per community card (flop1→river): from JS client hands.js cardPosition.card9→card13
// Injected into getLocalTransformMatrix — see card creation loop in _buildUI.
const COMM_SKEW_X = [0.09, 0.03, 0, -0.04, -0.09];

// Tint values matching the original JS client
const TINT_LIVE = 0xffffff;
const TINT_DEAD = 0x7f7f7f;

// ----------------------------------------------------------------
// Layout tables — mobile theme from HedgeEmJavaScriptClient/odobo/src/js/hands.js
// Landscape: 1024×640 design space. Portrait: 640×1024 design space.
// ----------------------------------------------------------------

// LANDSCAPE (1024×640)
// Card positions: mobile theme (hands.js THEME=='mobile', cardPosition landscape)
// Hand positions: mobile theme (hands.js handPosition landscape)
const L_CARD_POSITIONS = [
  // Hand 1
  { x: 203, y: 376, angle:  8 },   // imgCard[0]
  { x: 256, y: 383, angle:  8 },   // imgCard[1]
  // Hand 2
  { x: 394, y: 400, angle:  3.5 }, // imgCard[2]
  { x: 446, y: 403, angle:  3.5 }, // imgCard[3]
  // Hand 3
  { x: 590, y: 401, angle: -3.5 }, // imgCard[4]
  { x: 640, y: 398, angle: -3.5 }, // imgCard[5]
  // Hand 4 (hidden in 3-handed mode)
  { x: 780, y: 384, angle: -8 },   // imgCard[6]
  { x: 830, y: 376, angle: -8 },   // imgCard[7]
  // Community cards — y=120 aligns cards with felt outline on tablel_hedgeem_blue.png
  { x: 270, y: 120, angle: 0 },    // imgCard[8]  flop 1
  { x: 375, y: 120, angle: 0 },    // imgCard[9]  flop 2
  { x: 475, y: 120, angle: 0 },    // imgCard[10] flop 3
  { x: 624, y: 120, angle: 0 },    // imgCard[11] turn
  { x: 780, y: 120, angle: 0 },    // imgCard[12] river
];
const L_HAND_POSITIONS = [
  { x: 225, y: 380 }, // hand 1
  { x: 425, y: 400 }, // hand 2
  { x: 620, y: 400 }, // hand 3
  { x: 805, y: 380 }, // hand 4 (hidden in 3-handed mode)
];

// PORTRAIT (640×1024)
// Hand positions from hands.js handPosition portrait (same for mobile and non-mobile themes).
// Card positions derived from hand positions using portrait offsets from hands.js:
//   card1: hand_x + 0,  hand_y + 55
//   card2: hand_x + 30, hand_y + 75
// Community cards placed at top of portrait table felt (centred on x=320).
const P_HAND_POSITIONS = [
  { x: 112, y: 411 }, // hand 1
  { x: 248, y: 426 }, // hand 2
  { x: 392, y: 426 }, // hand 3
  { x: 528, y: 411 }, // hand 4 (hidden in 3-handed mode)
];
const P_CARD_POSITIONS = [
  // Hand 1 (x=112, y=411)
  { x: 112, y: 466, angle:  8 },   // imgCard[0]
  { x: 142, y: 486, angle:  8 },   // imgCard[1]
  // Hand 2 (x=248, y=426)
  { x: 248, y: 481, angle:  3.5 }, // imgCard[2]
  { x: 278, y: 501, angle:  3.5 }, // imgCard[3]
  // Hand 3 (x=392, y=426)
  { x: 392, y: 481, angle: -3.5 }, // imgCard[4]
  { x: 422, y: 501, angle: -3.5 }, // imgCard[5]
  // Hand 4 (x=528, y=411) — hidden in 3-handed mode
  { x: 528, y: 466, angle: -8 },   // imgCard[6]
  { x: 558, y: 486, angle: -8 },   // imgCard[7]
  // Community cards — centred across 640px width, near top of portrait felt
  { x: 160, y: 210, angle: 0 },    // imgCard[8]  flop 1
  { x: 248, y: 210, angle: 0 },    // imgCard[9]  flop 2
  { x: 336, y: 210, angle: 0 },    // imgCard[10] flop 3
  { x: 448, y: 210, angle: 0 },    // imgCard[11] turn
  { x: 560, y: 210, angle: 0 },    // imgCard[12] river
];

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private api!: ApiClient;

  // Current layout (set in create, updated on orientation change)
  private isPortrait!: boolean;
  private cardPositions!: typeof L_CARD_POSITIONS;
  private handPositions!: typeof L_HAND_POSITIONS;

  // Window resize handler reference (for cleanup)
  private _resizeHandler!: () => void;

  // Sprites
  private imgCard: Phaser.GameObjects.Sprite[] = [];
  private imgHand: Phaser.GameObjects.Image[] = [];
  private imgDeadHand: Phaser.GameObjects.Image[] = [];
  private imgCantLose: Phaser.GameObjects.Image[] = [];
  private dealBtn!: Phaser.GameObjects.Sprite;
  private advanceBtn!: Phaser.GameObjects.Sprite;

  // Text overlays
  // oddsTexts: BitmapText using handfont (matches JS client). Handles odds numbers only (x2.1 etc.).
  // winTexts: regular Text for WIN label — handfont lacks W/I/N so cannot use BitmapText for this.
  // DEAD is handled by the imgDeadHand skull image; no text needed.
  private oddsTexts: Phaser.GameObjects.BitmapText[] = [];
  private winTexts: Phaser.GameObjects.Text[] = [];
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

    // Detect orientation and select layout. The canvas base resolution was already
    // set by main.ts (1024×640 landscape OR 640×1024 portrait) before Phaser booted,
    // and is updated by _checkOrientation on subsequent rotations.
    this.isPortrait = window.innerHeight > window.innerWidth;
    this._applyLayout(this.isPortrait);
    this._buildUI();

    // Listen for orientation changes and rebuild the layout when they occur.
    this._resizeHandler = () => this._checkOrientation();
    window.addEventListener('resize', this._resizeHandler);
    this.events.once('shutdown', () => {
      window.removeEventListener('resize', this._resizeHandler);
    });

    // API prefetch disabled — data source is in-app coredata by default.
    // Enable via the config options page when HEDGE-82 / HEDGE-83 are implemented.
    // this.api.prefetch(NUMBER_OF_HANDS);
  }

  /** Select layout tables and resize the Phaser canvas for the given orientation. */
  private _applyLayout(portrait: boolean): void {
    this.isPortrait    = portrait;
    this.cardPositions = portrait ? P_CARD_POSITIONS : L_CARD_POSITIONS;
    this.handPositions = portrait ? P_HAND_POSITIONS : L_HAND_POSITIONS;
    if (portrait) {
      this.scale.resize(640, 1024);
    } else {
      this.scale.resize(1024, 640);
    }
  }

  /** Called on every window resize; rebuilds the scene if orientation flipped. */
  private _checkOrientation(): void {
    const nowPortrait = window.innerHeight > window.innerWidth;
    if (nowPortrait !== this.isPortrait) {
      // Resize the Phaser canvas BEFORE restarting so main.ts initial detect aligns.
      this._applyLayout(nowPortrait);
      // scene.restart() re-runs create() fresh with new canvas dimensions.
      this.scene.restart();
    }
  }

  // ----------------------------------------------------------------
  // UI construction
  // ----------------------------------------------------------------

  private _buildUI(): void {
    const { width, height } = this.scale;

    // Table background — landscape or portrait variant.
    // Landscape: centred at (512, 320) — canvas centre, matches JS client tablePosition.
    // Portrait: centred at (320, 400) — matches JS client tablePosition (NOT canvas centre 512).
    const tableKey = this.isPortrait ? 'tablep' : 'table';
    const tableY = this.isPortrait ? 400 : height / 2;
    this.add.image(width / 2, tableY, tableKey);

    // Hand panel images — positions from current layout (landscape or portrait)
    for (let i = 0; i < NUMBER_OF_HANDS; i++) {
      const { x, y } = this.handPositions[i];
      this.imgHand[i] = this.add.image(x, y, `hand${i + 1}`).setVisible(false);

      // Dead hand skull overlay — same position as hand panel
      this.imgDeadHand[i] = this.add.image(x, y, 'deadhand')
        .setVisible(false).setDepth(2);

      // Can't-lose overlay — shown when statusCantLose:true (100% win, odds undefined)
      this.imgCantLose[i] = this.add.image(x, y, 'cantlose')
        .setVisible(false).setDepth(2);

      // Odds BitmapText — handfont matches JS client, size 50. Handles x2.1, x40.0 etc.
      // Positioned above the top edge of hole cards (CARD_H/2 above hand centre, plus padding).
      this.oddsTexts[i] = this.add.bitmapText(x, y - CARD_H / 2 - 20, 'handfont', '', 50)
        .setOrigin(0.5).setDepth(3).setVisible(false);

      // WIN label — regular Text because handfont lacks W/I/N characters.
      // Shown instead of oddsTexts at game-over when this hand wins.
      this.winTexts[i] = this.add.text(x, y - CARD_H / 2 - 20, 'WIN', {
        fontSize: '40px', color: '#00ff88', fontFamily: 'Arial Black, sans-serif',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(3).setVisible(false);

      // Hand description (below odds) — disabled pending HEDGE-85 config option.
      // Re-enable by restoring setVisible(true) in _renderHandPanels when config flag is added.
      this.handDescTexts[i] = this.add.text(x, y + 22, '', {
        fontSize: '11px', color: '#ffe080', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(3).setVisible(false);
    }

    // 13 card sprites: cards 0-7 = hole cards (2 per hand), 8-12 = community.
    // Community cards (8-12) have skewX applied via getLocalTransformMatrix override
    // to simulate the 3D perspective of the back of the table (HEDGE-73).
    for (let c = 0; c < 13; c++) {
      const pos = this.cardPositions[c];
      const w = c >= 8 ? COMM_W : CARD_W;
      const h = c >= 8 ? COMM_H : CARD_H;
      const card = this.add.sprite(pos.x, pos.y, 'cards', 52)
        .setDisplaySize(w, h)
        .setAngle(pos.angle)
        .setVisible(false)
        .setDepth(1);
      // Apply skewX to community cards (HEDGE-73).
      // Phaser 3.90 batchSprite calls _tempMatrix2.applyITRS() directly — it never calls
      // getLocalTransformMatrix on the game object. To inject skewX we override renderWebGL
      // on the instance and temporarily patch _tempMatrix2.applyITRS before batchSprite runs.
      // Sign convention matches Phaser 2 / PIXI: c = -sin(skewX)*scaleY ≈ -skewX * d.
      if (c >= 8) {
        const skewX = COMM_SKEW_X[c - 8];
        if (skewX !== 0) {
          (card as any).renderWebGL = function (
            this: Phaser.GameObjects.Sprite,
            _renderer: Phaser.Renderer.WebGL.WebGLRenderer,
            src: Phaser.GameObjects.Sprite,
            camera: Phaser.Cameras.Scene2D.Camera,
            parentMatrix: Phaser.GameObjects.Components.TransformMatrix,
          ) {
            camera.addToRenderList(src);
            const pipeline = (this as any).pipeline as any;
            const mat = pipeline._tempMatrix2;
            const orig = mat.applyITRS.bind(mat);
            mat.applyITRS = function (x: number, y: number, r: number, sx: number, sy: number) {
              orig(x, y, r, sx, sy);
              this.c -= skewX * this.d; // Phaser 2 style: c = sin(-skewX)*scaleY ≈ -skewX*d
              return this;
            };
            pipeline.batchSprite(src, camera, parentMatrix);
            mat.applyITRS = orig;
          };
        }
      }
      this.imgCard[c] = card;
    }

    // Deal and Advance buttons share the same position — they are never both visible,
    // so co-locating them avoids the visual "jump" when one swaps for the other.
    // Landscape: JS client mobile theme buttons.js — deal: x=965, y=440.
    // Portrait: bottom-right within 640×1024 canvas.
    const dealBtnPos    = this.isPortrait ? { x: 560, y: 940 } : { x: 965, y: 440 };
    const advanceBtnPos = dealBtnPos;

    // Deal button — frame 0 of spritesheet (256×256 = 2×2 grid of 128×128 frames)
    this.dealBtn = this.add.sprite(dealBtnPos.x, dealBtnPos.y, 'dealbutton', 0)
      .setDisplaySize(90, 90)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);
    this.dealBtn.on('pointerdown', () => this._onDeal());
    this.dealBtn.on('pointerover', () => this.dealBtn.setTint(0xddddff));
    this.dealBtn.on('pointerout',  () => this.dealBtn.clearTint());

    // Advance button — uses frame 0 of dealbutton spritesheet with green tint as placeholder
    // (rightbutton.png asset not yet sourced)
    this.advanceBtn = this.add.sprite(advanceBtnPos.x, advanceBtnPos.y, 'dealbutton', 0)
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
      const cantLose = this.engine.isHandCantLose(i);
      const dead     = this.engine.isHandDead(i);
      // Only show WIN at game-over — statusIsWinner:true in coredata is a mid-game prediction,
      // not the result. Showing it mid-game would spoil the outcome before river.
      const winner = this.engine.isGameOver && this.engine.isHandWinner(i);

      this.imgDeadHand[i].setVisible(dead);
      this.imgCantLose[i].setVisible(cantLose && !winner);

      // HEDGE-85: hand descriptions hidden pending config option — restore setVisible(true) when implemented
      // this.handDescTexts[i].setVisible(true);

      if (winner) {
        // WIN: hide odds BitmapText, show regular Text (handfont has no W/I/N)
        this.oddsTexts[i].setVisible(false);
        this.winTexts[i].setVisible(true);
        // this.handDescTexts[i].setText(info?.handDescShort ?? '');  // HEDGE-85
      } else if (cantLose) {
        // HEDGE-87: dead cert — cantlose.png image handles display, suppress odds (would show x0)
        this.oddsTexts[i].setVisible(false);
        this.winTexts[i].setVisible(false);
      } else if (dead) {
        // DEAD: skull image handles display — hide both text objects
        this.oddsTexts[i].setVisible(false);
        this.winTexts[i].setVisible(false);
        // this.handDescTexts[i].setText('');  // HEDGE-85
      } else if (info) {
        // In play: show handfont BitmapText odds, hide WIN label
        // HEDGE-86: suppress trailing .0 for whole numbers (x5 not x5.0)
        const odds = info.oddsRounded;
        const oddsStr = Number.isInteger(odds) ? `x${odds}` : `x${odds.toFixed(1)}`;
        this.oddsTexts[i].setText(oddsStr).setTint(0xffffff).setVisible(true);
        this.winTexts[i].setVisible(false);
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
