/**
 * HedgeEm Utility Functions
 *
 * Ported from HedgeEmRandomGenerator.cs, HedgeEmUtility.cs (hedgeem_server)
 * Hand evaluation ported from HandEvaluator.cs — replaced with pokersolver
 * (pokersolver replaces the open source C# HoldemHand library)
 *
 * This module provides a collection of stateless utility functions — no DB or
 * auth dependency. Only needs the information passed in the arguments.
 *
 * Example usage:
 *   import { shuffleDeck, getHandDescriptionLong, determineChipDenomsForStackValue } from './_lib/utils';
 *   const deck = shuffleDeck();
 *   const desc = getHandDescriptionLong('Ac 2c Qd 4h Jd 2d As');
 *   const chips = determineChipDenomsForStackValue(295);
 */

import { BettingStage, ChipDenomination } from './enums';

// pokersolver has no bundled types — declare the minimum surface we use
declare const require: (m: string) => any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Hand: PokerHand } = require('pokersolver');

// ============================================================
// CARD CONSTANTS
// ============================================================

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['c','d','h','s'];

// Full 52-card deck as strings e.g. ['2c','3c',...,'As']
const FULL_DECK: string[] = RANKS.flatMap(r => SUITS.map(s => r + s));

// ============================================================
// CARD SHUFFLER
// Ported from HedgeEmRandomGenerator.cs
// Original author: Simon Hewins, 18 Aug 2011
//
// Generates a shuffled deck of 52 unique randomly ordered card strings
// (each representing a playing card in a standard pack).
//
// IMPORTANT: The Random number generator is created inside the loop on
// every call. In the original C# code this was a deliberate fix — creating
// it outside caused the same cycle of 52 random numbers to repeat on every
// call, a very nasty hard-to-find bug. Math.random() in JS does not have
// this problem but the note is preserved for historical context.
//
// Note: the original C# version also had a fallback to an external random
// number generator at virtualhorsham.co.uk — this has been removed as the
// external service is no longer available.
// ============================================================

/**
 * Returns a shuffled deck of 52 card strings (e.g. 'Ac', 'Kd', '2h').
 *
 * Uses a 5-pass shuffle: each pass iterates all 52 cards and swaps each
 * with a randomly chosen card from anywhere in the deck.
 * Note: this is not a strict Fisher-Yates shuffle (which would pick only
 * from the unshuffled portion) — it matches the original C# behaviour exactly.
 */
export function shuffleDeck(): string[] {
  const deck = [...FULL_DECK];

  // First loop: shuffle the pack 5 times (by executing the second loop)
  for (let pass = 0; pass < 5; pass++) {
    // Second loop: for each card in the pack swap its position with another
    // card randomly chosen from anywhere in the pack
    for (let i = 0; i < 52; i++) {
      // Pick a random card in the pack
      const j = Math.floor(Math.random() * 52);

      // Temporarily store a card from the pack
      const tmp = deck[i];

      // ...and swap it with the randomly chosen card
      deck[i] = deck[j];
      deck[j] = tmp;
    }
  }

  return deck;
}

// ============================================================
// CHIP UTILITIES
// Ported from HedgeEmUtility.cs
// ============================================================

/**
 * Returns the face value of a chip denomination.
 * Ported from f_get_chip_value(enum_chip_denomination).
 *
 * @param chip - A ChipDenomination enum value
 * @returns The numeric face value (e.g. ChipDenomination.C100 → 100)
 */
export function getChipValue(chip: ChipDenomination): number {
  switch (chip) {
    case ChipDenomination.C1000: return 1000;
    case ChipDenomination.C500:  return 500;
    case ChipDenomination.C100:  return 100;
    case ChipDenomination.C50:   return 50;
    case ChipDenomination.C25:   return 25;
    case ChipDenomination.C10:   return 10;
    case ChipDenomination.C5:    return 5;
    case ChipDenomination.C1:    return 1;
  }
}

/**
 * Breaks a player's stack value into chip counts, highest denomination first.
 * Returns an 8-element array indexed by ChipDenomination enum value.
 *
 * Ported from f_determine_chip_denoms_for_stack_value(double).
 *
 * Note: uses Math.floor on the input — fractional values are not yet supported
 * (marked as xxx HACK in the original C# code).
 *
 * Example:
 *   determineChipDenomsForStackValue(295)
 *   → [0, 0, 2, 1, 1, 2, 0, 0]
 *   = two 100s, one 50, one 25, two 10s
 *
 * @param stackValue - The total stack/pot value to count into chips
 * @returns Array of chip counts indexed by ChipDenomination
 */
export function determineChipDenomsForStackValue(stackValue: number): number[] {
  const chips = new Array<number>(8).fill(0);

  // Set the value of the stack/pot that needs to be counted.
  // HACK: using floor as the function is not yet coded to support fractions of $
  let remaining = Math.floor(stackValue);

  // Cycle through all chip denominations from highest to lowest and test if the
  // pot/stack is big enough to be comprised of these chips.
  // If so record how many; if not move on to the next lowest value.
  for (let chip = ChipDenomination.C1000; chip <= ChipDenomination.C1; chip++) {
    // Determine the value of the current chip
    const value = getChipValue(chip);

    // Determine how many of these chips could be bought by the pot/stack.
    // e.g. if the pot is $295 and you are working with $100 chips you could have 2 x $100 chips
    const count = Math.floor(remaining / value);

    // If you determine that you could use chips of this value then record this
    chips[chip] = count;

    // Determine how big the pot/stack will be when you remove the value of the
    // chips determined above.
    // e.g. if you started with a $295 pot and just removed $200 you have $95 left to count
    remaining -= value * count;

    // Return if the stack has been fully counted
    if (remaining <= 0) break;
  }

  return chips;
}

// ============================================================
// BETTING STAGE
// Ported from HedgeEmUtility.f_get_betting_stage_as_string()
// ============================================================

/**
 * Converts a BettingStage enum value to its string name.
 * e.g. BettingStage.FLOP → 'FLOP'
 */
export function getBettingStageAsString(stage: BettingStage): string {
  return BettingStage[stage];
}

// ============================================================
// HAND EVALUATION
// Replaces the C# HoldemHand open source library — uses pokersolver.
//
// A 'hand mask' is a space-separated string of cards used to form a poker hand.
// The first two cards represent the HOLE cards, followed by up to five
// community cards (FLOP, TURN, RIVER). Each card is two characters:
// rank (2-9, T, J, Q, K, A) + suit (c=clubs, d=diamonds, h=hearts, s=spades).
//
// Example hand mask: 'Ac 2c Qd 4h Jd 2d As'
//   Hole cards: Ac 2c
//   Flop: Qd 4h Jd
//   Turn: 2d
//   River: As
//
// Input can be a space-separated string or an array of card strings.
// ============================================================

function parseCards(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;
  return input.trim().split(/\s+/);
}

/**
 * Returns the short name of the best poker hand that can be made from the cards supplied.
 * e.g. 'Two Pair', 'Flush', 'Full House'
 *
 * Ported from f_get_hand_description_short().
 * Replaces Hand.f_get_shortHandDescriptionFromMask() from the C# HoldemHand library.
 *
 * Example:
 *   getHandDescriptionShort('Ac 2c Qd 4h Jd 2d As')
 *   → 'Two Pair'  (Two pairs: Aces and Twos)
 *
 * @param cards - Space-separated hand mask string or array of card strings
 */
export function getHandDescriptionShort(cards: string | string[]): string {
  const solved = PokerHand.solve(parseCards(cards));
  return solved.name as string;
}

/**
 * Returns the full description of the best poker hand that can be made from the cards supplied.
 * e.g. 'Two Pair, Aces and Twos', 'Flush, Ace High', 'Full House, Aces Full of Kings'
 *
 * Ported from f_get_hand_description_long().
 * Replaces Hand.DescriptionFromMask() from the C# HoldemHand library.
 *
 * Example:
 *   getHandDescriptionLong('Ac 2c Qd 4h Jd 2d As')
 *   → 'Two Pair, Aces and Twos'
 *
 * @param cards - Space-separated hand mask string or array of card strings
 */
export function getHandDescriptionLong(cards: string | string[]): string {
  const solved = PokerHand.solve(parseCards(cards));
  return solved.descr as string;
}

/**
 * Returns the best 5-card combination as an array of card strings.
 * e.g. ['Ac', 'As', '2c', '2d', 'Qd'] from a 7-card input.
 *
 * Ported from f_get_best_five_cards().
 * Replaces Hand.f_get_best_five_cards() from the C# HoldemHand library.
 *
 * @param cards - Space-separated hand mask string or array of card strings
 */
export function getBestFiveCards(cards: string | string[]): string[] {
  const solved = PokerHand.solve(parseCards(cards));
  return (solved.cards as any[]).map((c: any) => c.value + c.suit);
}

// ============================================================
// DEAL LOGIC
// Ported from HedgeEmGame.f_assignHoleCards (hedgeem_server)
//
// Deals a complete game from a fresh shuffled deck:
//   - 2 hole cards per hand
//   - 3 flop cards + 1 turn + 1 river board cards
// ============================================================

export interface DealtGame {
  hands: string[];     // e.g. ['AcKd', 'QsJs', '8h7c'] — one 4-char string per hand
  bc1: string;         // Flop card 1
  bc2: string;         // Flop card 2
  bc3: string;         // Flop card 3
  bc4: string;         // Turn card
  bc5: string;         // River card
}

/**
 * Shuffles a fresh deck and deals a complete game: hole cards for each hand
 * and all 5 board cards (flop + turn + river).
 *
 * Ported from HedgeEmGame.f_assignHoleCards() — deals 2 hole cards per hand
 * sequentially from the top of the shuffled deck, then the next 5 cards become
 * the board (3 flop + 1 turn + 1 river), matching the original C# dealing order.
 *
 * @param numberOfHands - Number of hands to deal (3 or 4)
 */
export function dealGame(numberOfHands: number): DealtGame {
  const deck = shuffleDeck();

  const hands: string[] = [];
  for (let i = 0; i < numberOfHands; i++) {
    hands.push(deck[i * 2] + deck[i * 2 + 1]);
  }

  // Board cards start immediately after the last hole card
  const b = numberOfHands * 2;
  return {
    hands,
    bc1: deck[b],
    bc2: deck[b + 1],
    bc3: deck[b + 2],
    bc4: deck[b + 3],
    bc5: deck[b + 4],
  };
}

// ============================================================
// ODDS CALCULATOR — ALL STAGES
// Ported from HedgeEmGame odds pipeline (hedgeem_server).
// Uses pokersolver (CJS) — replaces the ESM-only poker-odds-calculator package.
//
// For each stage we simulate the unknown community cards via Monte Carlo,
// then compute the full odds chain (actual → margin → rounded) for display.
//
// Stage overview:
//   HOLE  — 0 community cards known, simulate 5  (pre-flop)
//   FLOP  — 3 community cards known, simulate 2  (turn + river)
//   TURN  — 4 community cards known, simulate 1  (river)
//   RIVER — 5 community cards known, deterministic evaluation (no simulation)
// ============================================================

export interface HandOddsResult {
  winPercentage: number;
  drawPercentage: number;
}

/**
 * Core Monte Carlo simulator used by all pre-river stage calculators.
 * Evaluates each hand over `iterations` random completions of the board.
 *
 * @param holeCards  - Parsed hole card pairs, e.g. [['Ac','Kd'], ['Qs','Js']]
 * @param known      - Community cards already revealed (0–4 cards)
 * @param simulate   - Number of additional community cards to simulate (5 - known.length)
 * @param remaining  - Cards not yet in play (mutated in place for perf — pass a copy if needed)
 * @param iterations - Monte Carlo iterations
 */
function simulateOdds(
  holeCards: [string, string][],
  known: string[],
  simulate: number,
  remaining: string[],
  iterations: number,
): HandOddsResult[] {
  const n = holeCards.length;
  const wins = new Array<number>(n).fill(0);
  const ties = new Array<number>(n).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    // In-place partial Fisher-Yates: shuffle `simulate` cards to the front of `remaining`
    for (let i = 0; i < simulate; i++) {
      const j = i + Math.floor(Math.random() * (remaining.length - i));
      const tmp = remaining[i]; remaining[i] = remaining[j]; remaining[j] = tmp;
    }
    const community = [...known, ...remaining.slice(0, simulate)];

    const solved = holeCards.map(([c1, c2]) => PokerHand.solve([c1, c2, ...community]));
    const winners: any[] = PokerHand.winners(solved);

    if (winners.length === 1) {
      wins[solved.indexOf(winners[0])]++;
    } else {
      winners.forEach((w: any) => ties[solved.indexOf(w)]++);
    }
  }

  return holeCards.map((_, i) => ({
    winPercentage: parseFloat(((wins[i] / iterations) * 100).toFixed(1)),
    drawPercentage: parseFloat(((ties[i] / iterations) * 100).toFixed(1)),
  }));
}

/** Builds the set of cards not in play given hole cards and known community cards. */
function buildRemaining(holeCards: [string, string][], known: string[]): string[] {
  const used = new Set([...holeCards.flat(), ...known]);
  return FULL_DECK.filter(c => !used.has(c));
}

/**
 * Pre-flop odds (HOLE stage): all 5 community cards unknown, simulate all 5.
 *
 * @param hands      - Array of 4-char hole card pair strings, e.g. ['AcKd', 'QsJs']
 * @param iterations - Monte Carlo iterations (default 10,000)
 */
export function calculatePreFlopOdds(hands: string[], iterations = 10_000): HandOddsResult[] {
  const holeCards: [string, string][] = hands.map(h => [h.slice(0, 2), h.slice(2, 4)]);
  const remaining = buildRemaining(holeCards, []);
  return simulateOdds(holeCards, [], 5, remaining, iterations);
}

/**
 * Flop odds (FLOP stage): 3 community cards known, simulate turn + river.
 *
 * @param hands      - Array of 4-char hole card pair strings
 * @param flop       - 3 flop card strings, e.g. ['Ah', '7d', '2c']
 * @param iterations - Monte Carlo iterations (default 10,000)
 */
export function calculateFlopOdds(hands: string[], flop: string[], iterations = 10_000): HandOddsResult[] {
  const holeCards: [string, string][] = hands.map(h => [h.slice(0, 2), h.slice(2, 4)]);
  const remaining = buildRemaining(holeCards, flop);
  return simulateOdds(holeCards, flop, 2, remaining, iterations);
}

/**
 * Turn odds (TURN stage): 4 community cards known, simulate river only.
 *
 * @param hands      - Array of 4-char hole card pair strings
 * @param flop       - 3 flop card strings
 * @param turnCard   - Turn card string, e.g. 'Ks'
 * @param iterations - Monte Carlo iterations (default 10,000)
 */
export function calculateTurnOdds(hands: string[], flop: string[], turnCard: string, iterations = 10_000): HandOddsResult[] {
  const holeCards: [string, string][] = hands.map(h => [h.slice(0, 2), h.slice(2, 4)]);
  const known = [...flop, turnCard];
  const remaining = buildRemaining(holeCards, known);
  return simulateOdds(holeCards, known, 1, remaining, iterations);
}

/**
 * River odds (RIVER stage): all 5 community cards known — deterministic evaluation,
 * no simulation needed.
 *
 * @param hands      - Array of 4-char hole card pair strings
 * @param community  - All 5 community cards [bc1, bc2, bc3, bc4, bc5]
 * @returns Per-hand results: winner gets winPercentage=100, tied hands get drawPercentage=100,
 *          losers get 0/0.
 */
export function calculateRiverOdds(hands: string[], community: string[]): HandOddsResult[] {
  const holeCards: [string, string][] = hands.map(h => [h.slice(0, 2), h.slice(2, 4)]);
  const solved = holeCards.map(([c1, c2]) => PokerHand.solve([c1, c2, ...community]));
  const winners: any[] = PokerHand.winners(solved);

  return hands.map((_, i) => {
    const isWinner = winners.includes(solved[i]);
    const isTie = isWinner && winners.length > 1;
    return {
      winPercentage: isWinner && !isTie ? 100 : 0,
      drawPercentage: isTie ? 100 : 0,
    };
  });
}

// ============================================================
// HOUSE MARGIN / ODDS CHAIN
// Ported from HedgeEmHandStageInfo odds properties (hedgeem_client_class_library).
//
// The full chain from raw probability → player-facing odds:
//   percentWinOrDraw  →  oddsActual  →  oddsMargin  →  oddsRounded
//                                 (× targetRtp)     (round to 1 d.p.)
//
// oddsActual  = 100 / percentWinOrDraw          (fair decimal odds)
// oddsMargin  = oddsActual × targetRtp          (apply house edge)
// oddsRounded = round(oddsMargin, 1 d.p.)       (displayed to player as "1:X")
// actualRtp   = oddsRounded / oddsActual         (effective RTP for this bet)
// roundingRake = (oddsMargin - oddsRounded) / oddsActual  (margin lost to rounding)
// ============================================================

export interface OddsChain {
  oddsActual: number;
  oddsMargin: number;
  oddsRounded: number;
  actualRtp: number;
  roundingRake: number;
}

/**
 * Computes the full odds chain from raw win/draw percentages and target RTP.
 * Ported from HedgeEmHandStageInfo property calculations.
 *
 * @param percentWin  - Win probability 0–100
 * @param percentDraw - Draw/tie probability 0–100
 * @param targetRtp   - House RTP target, e.g. 0.97 for 97%
 */
export function computeOddsChain(percentWin: number, percentDraw: number, targetRtp: number): OddsChain {
  const percentWinOrDraw = percentWin + percentDraw;

  if (percentWinOrDraw === 0) {
    return { oddsActual: 0, oddsMargin: 0, oddsRounded: 0, actualRtp: 0, roundingRake: 0 };
  }

  const oddsActual  = parseFloat((100 / percentWinOrDraw).toFixed(4));
  const oddsMargin  = parseFloat((oddsActual * targetRtp).toFixed(4));
  const oddsRounded = Math.round(oddsMargin * 10) / 10;
  const actualRtp   = parseFloat((oddsRounded / oddsActual).toFixed(4));
  const roundingRake = parseFloat(((oddsMargin - oddsRounded) / oddsActual).toFixed(4));

  return { oddsActual, oddsMargin, oddsRounded, actualRtp, roundingRake };
}
