/**
 * GameEngine — pure game logic, zero Phaser dependency.
 *
 * This class is the direct port of the logic spread across dealdata.js,
 * control.js, and buttons.js in HedgeEmJavaScriptClient. By keeping it
 * completely separate from the renderer it is 100% unit-testable with Vitest.
 *
 * Responsibilities:
 *   - Selecting a game record (from local coredata or live API)
 *   - Decoding card data (rank + suit from card strings)
 *   - Advancing the deal status (hole → flop → turn → river)
 *   - Exposing hand odds and status at the current stage
 *   - Tracking bets and credits
 *   - Producing a GameSnapshot for the renderer on every state change
 *
 * What GameEngine does NOT do:
 *   - Render anything (no Phaser, no canvas, no DOM)
 *   - Fetch from the API (that is the responsibility of ApiClient)
 *   - Play sounds
 */

import {
  type Card,
  type CardData,
  type GameRecord,
  type GameSnapshot,
  type HandStageInfo,
  type Bet,
  GameStateEnum,
} from './types';
import { coreData, threeHandedGameData, CORE_MODULUS, CORE_MODULUS_THREE_HANDED } from '../data/coredata';

// ---- Card decoding constants (ported from dealdata.js) ----
const RANK_LOOKUP = 'A23456789TJQK';
const SUIT_LOOKUP = 'cdhs';

export function decodeCard(cardStr: string): Card {
  const rank = RANK_LOOKUP.indexOf(cardStr.charAt(0));
  const suit = SUIT_LOOKUP.indexOf(cardStr.charAt(1));
  return { rank: rank >= 0 ? rank : 0, suit: suit >= 0 ? suit : 0 };
}

/**
 * Decodes all 13 cards for a game record into rank/suit pairs.
 * Positions 0-7: hole cards (2 per hand × 4 hands, or 2 per hand × 3 hands)
 * Positions 8-12: board cards (flop×3, turn, river)
 *
 * Ported from PopulateCardData() in dealdata.js.
 */
export function decodeCardData(record: GameRecord): CardData {
  const cardData: CardData = [];
  const n = record.numberOfHands;

  for (let card = 0; card < 13; card++) {
    let cardStr: string;

    if (card < n * 2) {
      // Hole card: hand index = floor(card/2), card within hand = card%2
      const handIdx = Math.floor(card / 2);
      const posInHand = card % 2;
      cardStr = record.hands[handIdx].slice(posInHand * 2, posInHand * 2 + 2);
    } else if (card === 8)  { cardStr = record.bc1; }
    else if (card === 9)    { cardStr = record.bc2; }
    else if (card === 10)   { cardStr = record.bc3; }
    else if (card === 11)   { cardStr = record.bc4; }
    else                    { cardStr = record.bc5; }

    cardData[card] = decodeCard(cardStr);
  }

  return cardData;
}

// ---- GameEngine class ----

export class GameEngine {
  private record!: GameRecord;
  private cardData!: CardData;
  private dealStatus: number = -1;     // -1 = not started; 0=hole,1=flop,2=turn,3=river
  private bets: Bet[] = [];
  private credits: number;
  private lastDataIndex: number = -1;
  private numberOfHands: number;
  private isLiveData: boolean = false;

  constructor(numberOfHands: 3 | 4 = 4, initialCredits = 10_000) {
    this.numberOfHands = numberOfHands;
    this.credits = initialCredits;
  }

  // ----------------------------------------------------------------
  // Game setup
  // ----------------------------------------------------------------

  /**
   * Loads a new game record from local coredata (random, no repeats).
   * Ported from PopulateCardData() / the else-branch in dealdata.js.
   */
  loadLocalGame(): void {
    const pool = this.numberOfHands === 3 ? threeHandedGameData : coreData;
    const modulus = this.numberOfHands === 3 ? CORE_MODULUS_THREE_HANDED : CORE_MODULUS;

    let idx: number;
    do {
      idx = Math.floor(Math.random() * modulus);
    } while (idx === this.lastDataIndex);

    this.lastDataIndex = idx;
    this.record = pool[idx];
    this.isLiveData = false;
    this._reset();
  }

  /**
   * Loads a game record sourced from the live API (/api/deal).
   * The ApiClient maps the API response into a GameRecord before calling this.
   */
  loadApiGame(record: GameRecord): void {
    this.record = record;
    this.isLiveData = true;
    this._reset();
  }

  private _reset(): void {
    this.cardData = decodeCardData(this.record);
    this.dealStatus = -1;
    this.bets = [];
  }

  // ----------------------------------------------------------------
  // Game state advancement
  // Ported from SetDealStatus() / AdvanceGameState() in dealdata.js + control.js
  // ----------------------------------------------------------------

  /** Returns the game state enum for a given deal status (0=hole…3=river) */
  _gameStateForStatus(status: number): number {
    const states = [
      GameStateEnum.STATUS_HOLE,
      GameStateEnum.STATUS_FLOP,
      GameStateEnum.STATUS_TURN,
      GameStateEnum.STATUS_RIVER,
    ];
    return states[status] ?? -1;
  }

  /**
   * Advances to the next deal status (hole → flop → turn → river).
   * Returns true if advanced, false if already at river (game over).
   */
  advance(): boolean {
    if (this.dealStatus >= 3) return false;
    this.dealStatus++;
    return true;
  }

  get isGameOver(): boolean {
    return this.dealStatus >= 3;
  }

  // ----------------------------------------------------------------
  // Data accessors
  // Ported from GetData* / Hand* functions in dealdata.js
  // ----------------------------------------------------------------

  /**
   * Returns the HandStageInfo entries for the current deal status.
   * Ported from the dealStatus * numberOfHands + hand indexing pattern.
   */
  getHandStageInfoForCurrentStatus(): HandStageInfo[] {
    if (this.dealStatus < 0) return [];
    const n = this.record.numberOfHands;
    const baseIdx = this.dealStatus * n;
    return this.record.handStageInfoList.slice(baseIdx, baseIdx + n);
  }

  getHandOdds(hand: number): number {
    const info = this._infoAt(hand);
    return info?.oddsRounded ?? 0;
  }

  isHandDead(hand: number): boolean {
    const info = this._infoAt(hand);
    if (!info) return false;
    return info.oddsRounded === 0 && !info.statusIsWinner;
  }

  isHandWinner(hand: number): boolean {
    return this._infoAt(hand)?.statusIsWinner ?? false;
  }

  isHandCantLose(hand: number): boolean {
    return this._infoAt(hand)?.statusCantLose ?? false;
  }

  getCardData(): CardData {
    return this.cardData;
  }

  getCard(index: number): Card {
    return this.cardData[index];
  }

  getDealStatus(): number {
    return this.dealStatus;
  }

  getNumberOfHands(): number {
    return this.record?.numberOfHands ?? this.numberOfHands;
  }

  getRecord(): GameRecord {
    return this.record;
  }

  getCredits(): number {
    return this.credits;
  }

  // ----------------------------------------------------------------
  // Betting
  // Ported from the bet placement logic in buttons.js / amounts.js
  // ----------------------------------------------------------------

  placeBet(handIndex: number, stakeAmount: number): boolean {
    if (this.dealStatus < 0 || this.dealStatus > 2) return false;
    if (stakeAmount > this.credits) return false;
    if (this.isHandDead(handIndex)) return false;

    const odds = this.getHandOdds(handIndex);
    this.credits -= stakeAmount;
    this.bets.push({
      stage: this.dealStatus,
      handIndex,
      stakeAmount,
      oddsAtBet: odds,
    });
    return true;
  }

  /**
   * Resolves all bets at river. Returns net payout (positive = win, 0 = no bets).
   * Ported from the payout logic in amounts.js.
   */
  resolveBets(): number {
    let totalPayout = 0;
    for (const bet of this.bets) {
      if (this.isHandWinner(bet.handIndex)) {
        totalPayout += bet.stakeAmount * bet.oddsAtBet;
      }
    }
    this.credits += totalPayout;
    return totalPayout;
  }

  getBets(): Bet[] {
    return [...this.bets];
  }

  // ----------------------------------------------------------------
  // Snapshot — the renderer calls this to get everything it needs
  // ----------------------------------------------------------------

  snapshot(): GameSnapshot {
    return {
      dealStatus: this.dealStatus,
      numberOfHands: this.record?.numberOfHands ?? this.numberOfHands,
      cardData: this.cardData ?? [],
      handStageInfo: this.getHandStageInfoForCurrentStatus(),
      bets: this.getBets(),
      credits: this.credits,
      gameOver: this.isGameOver,
      isLiveData: this.isLiveData,
    };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private _infoAt(hand: number): HandStageInfo | undefined {
    if (this.dealStatus < 0) return undefined;
    const n = this.record.numberOfHands;
    return this.record.handStageInfoList[this.dealStatus * n + hand];
  }
}
