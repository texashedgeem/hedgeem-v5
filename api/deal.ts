/**
 * POST /api/deal
 *
 * Shuffles the deck, deals hole cards to N hands, and calculates pre-flop odds.
 * This is the tactical implementation using the node-based poker odds calculator.
 * The strategic path is the UMA C++ math engine deployed as an HTTP microservice (HEDGE-43).
 *
 * Equivalent to the combined effect of:
 *   - HedgeEmUtility.f_shuffle_deck (card shuffle)
 *   - HedgeEmUtility.f_get_hand_equity_percentage / UMA math engine (odds)
 *   - The STATUS_START → STATUS_HOLE transition in f_change_table_game_state (dealing)
 *
 * Request body:
 *   { numberOfHands: number }   — 2–6 hands (default: 4)
 *
 * Returns a DealResponse containing:
 *   - hands: string[]           — hole card pairs, e.g. ["AcKd", "QsJs", "8h7c", "5d2c"]
 *   - handOdds: HedgeEmHandOdds[] — pre-flop win%, tie%, and decimal odds for each hand
 *   - remainingDeck: string[]   — cards not yet dealt (available for flop/turn/river)
 *
 * Odds calculation:
 *   - winPercentage: Monte Carlo simulation via poker-odds-calculator (100k iterations)
 *   - drawPercentage: probability of a split pot at showdown
 *   - odds: decimal odds multiplier (1 / winPercentage), e.g. 1.6 → displayed as "1:1.6"
 *   - The hand with the highest winPercentage is marked IN_PLAY_FAVOURITE; others IN_PLAY_BETTING_STAGE_ACTIVE
 *
 * Strategic path (HEDGE-43): Replace odds calculation with call to UMA C++ microservice.
 * The UMA math engine (source/math_source/wrapper/) computes exact combinatorial odds —
 * faster and more precise than Monte Carlo at the cost of deployment complexity.
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_lib/cors';
import { authenticate } from './_lib/auth';
import { BettingStage, HandStatus } from './_lib/enums';
import { HedgeEmHandOdds } from './_lib/types';
import { shuffleDeck, calculatePreFlopOdds } from './_lib/utils';

const MIN_HANDS = 2;
const MAX_HANDS = 6;
const DEFAULT_HANDS = 4;

export interface DealRequest {
  numberOfHands?: number;
}

export interface DealResponse {
  hands: string[];
  handOdds: HedgeEmHandOdds[];
  remainingDeck: string[];
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const auth = authenticate(req, res);
  if (!auth) return;

  const body: DealRequest = req.body ?? {};
  const numberOfHands = body.numberOfHands ?? DEFAULT_HANDS;

  if (
    typeof numberOfHands !== 'number' ||
    !Number.isInteger(numberOfHands) ||
    numberOfHands < MIN_HANDS ||
    numberOfHands > MAX_HANDS
  ) {
    res.status(400).json({ error: `numberOfHands must be an integer between ${MIN_HANDS} and ${MAX_HANDS}.` });
    return;
  }

  // Shuffle a fresh 52-card deck using the 5-pass Fisher-Yates shuffler
  // (ported from HedgeEmUtility.f_shuffle_deck — see utils.ts for full comments)
  const deck = shuffleDeck();

  // Deal 2 hole cards to each hand from the top of the shuffled deck
  const hands: string[] = [];
  for (let i = 0; i < numberOfHands; i++) {
    const card1 = deck[i * 2];
    const card2 = deck[i * 2 + 1];
    hands.push(card1 + card2); // e.g. "AcKd"
  }

  // Cards not yet in play — available for the flop (3), turn (1), river (1)
  const remainingDeck = deck.slice(numberOfHands * 2);

  // Calculate pre-flop win and tie percentages via Monte Carlo simulation (10k iterations).
  // Uses pokersolver (CJS) — avoids the ERR_REQUIRE_ESM problem that poker-odds-calculator
  // causes when Vercel bundles TypeScript to CommonJS. Strategic replacement: HEDGE-43.
  const oddsResults = calculatePreFlopOdds(hands);

  // Find the hand with the highest win equity — marked IN_PLAY_FAVOURITE
  let favouriteIndex = 0;
  let highestEquity = -1;
  for (let i = 0; i < numberOfHands; i++) {
    if (oddsResults[i].winPercentage > highestEquity) {
      highestEquity = oddsResults[i].winPercentage;
      favouriteIndex = i;
    }
  }

  // Build HedgeEmHandOdds array — shape matches the handOdds field in HedgeEmGameState
  const handOdds: HedgeEmHandOdds[] = hands.map((_, i) => {
    const { winPercentage, drawPercentage } = oddsResults[i];
    // Decimal odds: how much you get back per unit bet (including stake)
    // e.g. 62% win → 100/62 = 1.61. Guard against 0% to avoid divide-by-zero.
    const odds = winPercentage > 0 ? parseFloat((100 / winPercentage).toFixed(2)) : 0;
    const handStatus = i === favouriteIndex
      ? HandStatus.IN_PLAY_FAVOURITE
      : HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE;

    return {
      handIndex: i,
      bettingStage: BettingStage.HOLE,
      handStatus,
      winPercentage,
      drawPercentage,
      odds,
    };
  });

  const response: DealResponse = { hands, handOdds, remainingDeck };
  res.status(200).json(response);
}
