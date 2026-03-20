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
// PRE-FLOP ODDS CALCULATOR
// Uses pokersolver (CJS) — replaces the ESM-only poker-odds-calculator package.
// Implements Monte Carlo simulation equivalent to HedgeEmUtility odds methods
// and the UMA C++ math engine (exact combinatorial version tracked in HEDGE-43).
//
// For each iteration we randomly deal 5 community cards from the remaining deck
// (cards not assigned as hole cards), evaluate each player's best 7-card hand,
// and determine the winner(s). Ties are counted separately.
// ============================================================

export interface HandOddsResult {
  winPercentage: number;
  drawPercentage: number;
}

/**
 * Calculates pre-flop win and draw percentages for a set of hole card pairs
 * using Monte Carlo simulation.
 *
 * @param hands - Array of 4-char hole card pair strings, e.g. ['AcKd', 'QsJs']
 * @param iterations - Number of Monte Carlo iterations (default 10,000)
 * @returns Per-hand win% and draw% (draw = split pot / tie)
 */
export function calculatePreFlopOdds(hands: string[], iterations = 10_000): HandOddsResult[] {
  // Split each 4-char hand string into two 2-char card strings
  const holeCards: [string, string][] = hands.map(h => [h.slice(0, 2), h.slice(2, 4)]);

  // Build the remaining deck: all 52 cards not dealt as hole cards
  const dealtSet = new Set(holeCards.flat());
  const remaining: string[] = FULL_DECK.filter(c => !dealtSet.has(c));

  const wins = new Array<number>(hands.length).fill(0);
  const ties = new Array<number>(hands.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    // Randomly pick 5 community cards from the remaining deck
    // (in-place partial Fisher-Yates to avoid allocating a new array each iteration)
    for (let i = 0; i < 5; i++) {
      const j = i + Math.floor(Math.random() * (remaining.length - i));
      const tmp = remaining[i];
      remaining[i] = remaining[j];
      remaining[j] = tmp;
    }
    const community = remaining.slice(0, 5);

    // Evaluate each hand using pokersolver: best 5 from hole cards + 5 community cards
    const solved = holeCards.map(([c1, c2]) => PokerHand.solve([c1, c2, ...community]));
    const winners: any[] = PokerHand.winners(solved);

    if (winners.length === 1) {
      // Single winner
      const winIdx = solved.indexOf(winners[0]);
      wins[winIdx]++;
    } else {
      // Tie — all winners share the pot
      winners.forEach((w: any) => {
        const idx = solved.indexOf(w);
        ties[idx]++;
      });
    }
  }

  return hands.map((_, i) => ({
    winPercentage: parseFloat(((wins[i] / iterations) * 100).toFixed(1)),
    drawPercentage: parseFloat(((ties[i] / iterations) * 100).toFixed(1)),
  }));
}
