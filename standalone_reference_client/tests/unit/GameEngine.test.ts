/**
 * GameEngine unit tests — Vitest
 *
 * Covers the logic ported from dealdata.js, control.js, and buttons.js.
 * No Phaser, no DOM, no network — pure TypeScript.
 *
 * TODO: expand coverage as more of coredata.ts is populated and more
 *       game scenarios are exercised.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, decodeCard, decodeCardData } from '../../src/engine/GameEngine';
import type { GameRecord } from '../../src/engine/types';

// ----------------------------------------------------------------
// Fixture — a minimal but complete 4-handed game record
// ----------------------------------------------------------------

const FOUR_HAND_RECORD: GameRecord = {
  gameId: 'test-4h-001',
  numberOfHands: 4,
  numberOfBettingStages: 3,
  hands: ['AcKd', 'QsJs', '8h7c', '5d2c'],
  bc1: 'Ah', bc2: '3s', bc3: '9d', bc4: '2h', bc5: 'Kc',
  handStageInfoList: [
    // HOLE (dealStatus 0) — hands 0-3
    { handIndex: 0, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Ace high', handDescShort: 'Ace high', percentWin: 0.624, percentDraw: 0.021, percentWinOrDraw: 0.645, oddsActual: 1.6, oddsRounded: 1.6, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
    { handIndex: 1, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.213, percentDraw: 0.018, percentWinOrDraw: 0.231, oddsActual: 4.7, oddsRounded: 4.7, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 2, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Eight high', handDescShort: 'Eight high', percentWin: 0.102, percentDraw: 0.009, percentWinOrDraw: 0.111, oddsActual: 9.8, oddsRounded: 9.8, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 3, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Five high',  handDescShort: 'Five high',  percentWin: 0.061, percentDraw: 0.005, percentWinOrDraw: 0.066, oddsActual: 16.4, oddsRounded: 16.4, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    // FLOP (dealStatus 1) — hands 0-3
    { handIndex: 0, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Two pair', handDescShort: 'Two pair', percentWin: 0.782, percentDraw: 0.031, percentWinOrDraw: 0.813, oddsActual: 1.28, oddsRounded: 1.28, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
    { handIndex: 1, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.124, percentDraw: 0.012, percentWinOrDraw: 0.136, oddsActual: 8.1, oddsRounded: 8.1, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 2, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Dead',      handDescShort: 'Dead',      percentWin: 0.0,   percentDraw: 0.0,   percentWinOrDraw: 0.0,   oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 3, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Five high',  handDescShort: 'Five high',  percentWin: 0.094, percentDraw: 0.003, percentWinOrDraw: 0.097, oddsActual: 10.6, oddsRounded: 10.6, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    // TURN (dealStatus 2) — hands 0-3
    { handIndex: 0, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Two pair', handDescShort: 'Two pair', percentWin: 0.932, percentDraw: 0.0, percentWinOrDraw: 0.932, oddsActual: 1.07, oddsRounded: 1.07, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
    { handIndex: 1, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.068, percentDraw: 0.0, percentWinOrDraw: 0.068, oddsActual: 14.7, oddsRounded: 14.7, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 2, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Dead',      handDescShort: 'Dead',      percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 3, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Dead',      handDescShort: 'Dead',      percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    // RIVER (dealStatus 3) — hands 0-3
    { handIndex: 0, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Two pair', handDescShort: 'Two pair', percentWin: 1.0, percentDraw: 0.0, percentWinOrDraw: 1.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: true,  statusCantLose: false },
    { handIndex: 1, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 2, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Dead',      handDescShort: 'Dead',      percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    { handIndex: 3, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Dead',      handDescShort: 'Dead',      percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
  ],
};

// ----------------------------------------------------------------
// decodeCard
// ----------------------------------------------------------------

describe('decodeCard', () => {
  it('decodes Ace of clubs', () => {
    expect(decodeCard('Ac')).toEqual({ rank: 0, suit: 0 });
  });
  it('decodes King of spades', () => {
    expect(decodeCard('Ks')).toEqual({ rank: 12, suit: 3 });
  });
  it('decodes 2 of diamonds', () => {
    expect(decodeCard('2d')).toEqual({ rank: 1, suit: 1 });
  });
  it('decodes Ten of hearts', () => {
    // RANK_LOOKUP = 'A23456789TJQK' → T is at index 9
    expect(decodeCard('Th')).toEqual({ rank: 9, suit: 2 });
  });
});

// ----------------------------------------------------------------
// decodeCardData
// ----------------------------------------------------------------

describe('decodeCardData', () => {
  it('produces 13 card entries', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards).toHaveLength(13);
  });

  it('correctly decodes first hole card of hand 0 (Ac)', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards[0]).toEqual({ rank: 0, suit: 0 }); // A of clubs
  });

  it('correctly decodes second hole card of hand 0 (Kd)', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards[1]).toEqual({ rank: 12, suit: 1 }); // K of diamonds
  });

  it('correctly decodes first hole card of hand 1 (Qs)', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards[2]).toEqual({ rank: 11, suit: 3 }); // Q of spades
  });

  it('correctly decodes flop card 1 (Ah) at index 8', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards[8]).toEqual({ rank: 0, suit: 2 }); // A of hearts
  });

  it('correctly decodes river card (Kc) at index 12', () => {
    const cards = decodeCardData(FOUR_HAND_RECORD);
    expect(cards[12]).toEqual({ rank: 12, suit: 0 }); // K of clubs
  });
});

// ----------------------------------------------------------------
// GameEngine — state machine
// ----------------------------------------------------------------

describe('GameEngine — state machine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(4, 10_000);
    engine.loadApiGame(FOUR_HAND_RECORD);
  });

  it('starts at dealStatus -1 before first advance', () => {
    expect(engine.getDealStatus()).toBe(-1);
  });

  it('advances to hole (0) on first advance()', () => {
    engine.advance();
    expect(engine.getDealStatus()).toBe(0);
  });

  it('advances through all four stages', () => {
    engine.advance(); expect(engine.getDealStatus()).toBe(0); // hole
    engine.advance(); expect(engine.getDealStatus()).toBe(1); // flop
    engine.advance(); expect(engine.getDealStatus()).toBe(2); // turn
    engine.advance(); expect(engine.getDealStatus()).toBe(3); // river
  });

  it('returns false from advance() when already at river', () => {
    engine.advance(); engine.advance(); engine.advance(); engine.advance();
    expect(engine.advance()).toBe(false);
  });

  it('isGameOver is false before river', () => {
    engine.advance(); // hole
    expect(engine.isGameOver).toBe(false);
  });

  it('isGameOver is true at river', () => {
    engine.advance(); engine.advance(); engine.advance(); engine.advance();
    expect(engine.isGameOver).toBe(true);
  });
});

// ----------------------------------------------------------------
// GameEngine — odds accessors
// ----------------------------------------------------------------

describe('GameEngine — odds accessors', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(4, 10_000);
    engine.loadApiGame(FOUR_HAND_RECORD);
    engine.advance(); // hole stage
  });

  it('returns correct odds for hand 0 at hole (1.6)', () => {
    expect(engine.getHandOdds(0)).toBe(1.6);
  });

  it('returns correct odds for hand 1 at hole (4.7)', () => {
    expect(engine.getHandOdds(1)).toBe(4.7);
  });

  it('hand 0 is not dead at hole', () => {
    expect(engine.isHandDead(0)).toBe(false);
  });

  it('hand 2 is dead at flop (odds=0, not winner)', () => {
    engine.advance(); // flop
    expect(engine.isHandDead(2)).toBe(true);
  });

  it('hand 0 is winner at river', () => {
    engine.advance(); engine.advance(); engine.advance(); // flop → turn → river
    expect(engine.isHandWinner(0)).toBe(true);
  });

  it('hand 1 is not winner at river', () => {
    engine.advance(); engine.advance(); engine.advance();
    expect(engine.isHandWinner(1)).toBe(false);
  });
});

// ----------------------------------------------------------------
// GameEngine — betting
// ----------------------------------------------------------------

describe('GameEngine — betting', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(4, 10_000);
    engine.loadApiGame(FOUR_HAND_RECORD);
    engine.advance(); // hole stage
  });

  it('deducts stake from credits when bet is placed', () => {
    engine.placeBet(0, 100);
    expect(engine.getCredits()).toBe(9_900);
  });

  it('placeBet returns true on valid bet', () => {
    expect(engine.placeBet(1, 50)).toBe(true);
  });

  it('placeBet returns false when stake exceeds credits', () => {
    expect(engine.placeBet(0, 99_999)).toBe(false);
  });

  it('placeBet returns false on a dead hand', () => {
    engine.advance(); // flop — hand 2 is dead
    expect(engine.placeBet(2, 50)).toBe(false);
  });

  it('records bets correctly', () => {
    engine.placeBet(0, 100);
    const bets = engine.getBets();
    expect(bets).toHaveLength(1);
    expect(bets[0]).toMatchObject({ handIndex: 0, stakeAmount: 100, oddsAtBet: 1.6 });
  });

  it('resolveBets pays out winning hand at river', () => {
    engine.placeBet(0, 100); // hand 0 wins at river, odds 1.6 → payout = 160
    engine.advance(); engine.advance(); engine.advance(); // flop → turn → river
    const payout = engine.resolveBets();
    expect(payout).toBeCloseTo(160);
    // 10_000 - 100 (bet deducted) + 160 (payout) = 10_060
    expect(engine.getCredits()).toBeCloseTo(10_060);
  });

  it('resolveBets pays nothing for a losing bet', () => {
    engine.placeBet(1, 100); // hand 1 loses
    engine.advance(); engine.advance(); engine.advance();
    const payout = engine.resolveBets();
    expect(payout).toBe(0);
    expect(engine.getCredits()).toBe(9_900);
  });
});

// ----------------------------------------------------------------
// GameEngine — snapshot
// ----------------------------------------------------------------

describe('GameEngine — snapshot', () => {
  it('snapshot reflects current state after advance', () => {
    const engine = new GameEngine(4, 10_000);
    engine.loadApiGame(FOUR_HAND_RECORD);
    engine.advance();
    const snap = engine.snapshot();

    expect(snap.dealStatus).toBe(0);
    expect(snap.numberOfHands).toBe(4);
    expect(snap.handStageInfo).toHaveLength(4);
    expect(snap.credits).toBe(10_000);
    expect(snap.gameOver).toBe(false);
    expect(snap.isLiveData).toBe(true);
  });

  it('isLiveData is false when loaded from local data', () => {
    const engine = new GameEngine(4, 10_000);
    engine.loadLocalGame();
    engine.advance();
    expect(engine.snapshot().isLiveData).toBe(false);
  });
});
