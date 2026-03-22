/**
 * Core types for the HedgeEm game engine.
 * These are pure data structures with no Phaser dependency — used by both
 * GameEngine (logic) and GameScene (rendering).
 */

/** A single playing card */
export interface Card {
  rank: number; // 0=A, 1=2, 2=3, ... 12=K  (matches rankLookUp in original dealdata.js)
  suit: number; // 0=c, 1=d, 2=h, 3=s
}

/** Odds and status for one hand at one betting stage */
export interface HandStageInfo {
  handIndex: number;
  gameState: string;         // e.g. 'STATUS_HOLE'
  enumGameState: number;     // e.g. 6
  handDescLong: string;      // e.g. 'Ace high'
  handDescShort: string;
  percentWin: number;        // 0–1
  percentDraw: number;       // 0–1
  percentWinOrDraw: number;  // 0–1
  oddsActual: number;        // unrounded decimal odds
  oddsRounded: number;       // displayed odds
  statusIsFavourite: boolean;
  statusIsWinner: boolean;
  statusCantLose: boolean;
}

/** One complete pre-computed game (from coredata / API) */
export interface GameRecord {
  gameId: string;
  numberOfHands: number;       // 3 or 4
  numberOfBettingStages: number;
  hands: string[];             // e.g. ['AcKd', 'QsJs', '8h7c', '5d2c']
  bc1: string;                 // flop card 1
  bc2: string;                 // flop card 2
  bc3: string;                 // flop card 3
  bc4: string;                 // turn card
  bc5: string;                 // river card
  handStageInfoList: HandStageInfo[];
  // Optional metadata
  gameName?: string;
  gameDescription?: string;
}

/** Decoded card data for all 13 cards in a game (8 hole + 5 board) */
export type CardData = Card[];

/** The betting stages, matching the original enum_game_state values */
export enum GameStateEnum {
  STATUS_HOLE  = 6,
  STATUS_FLOP  = 10,
  STATUS_TURN  = 11,
  STATUS_RIVER = 12,
}

/** Which stage of the game we're currently showing odds for (0=hole, 1=flop, 2=turn) */
export type DealStatus = number;

/** Result of a bet placed by the player */
export interface Bet {
  stage: DealStatus;
  handIndex: number;
  stakeAmount: number;
  oddsAtBet: number;
}

/** Full snapshot of game state — passed from GameEngine to GameScene for rendering */
export interface GameSnapshot {
  dealStatus: DealStatus;
  numberOfHands: number;
  cardData: CardData;
  handStageInfo: HandStageInfo[];  // for current dealStatus only
  bets: Bet[];
  handBets: number[];              // total bet per hand (pence) — for chip stack display
  totalBet: number;                // sum of all hand bets (pence)
  winAmount: number;               // payout accumulated at river (pence)
  credits: number;
  gameOver: boolean;
  isLiveData: boolean;             // true = data came from API, false = local coredata
}
