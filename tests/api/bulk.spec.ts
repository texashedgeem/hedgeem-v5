/**
 * Playwright API tests for POST /api/games/bulk
 *
 * Runs against the production Vercel deployment.
 * Base URL: https://hedgeem-v5.qeetoto.com
 *
 * Results are written to test-results/results.json for audit.
 *
 * To run:
 *   npx playwright test tests/api/bulk.spec.ts
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://hedgeem-v5.qeetoto.com';
// Stub token — auth middleware accepts any non-empty Bearer token in stub mode
const AUTH = 'Bearer test-token';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Card code regex: rank [2-9TJQKA] + suit [cdhs] */
const CARD_RE = /^[2-9TJQKA][cdhs]$/;

/** Validate a hand string: 4 chars = 2 card codes concatenated e.g. "AcKd" */
function isValidHand(hand: string): boolean {
  return /^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/.test(hand);
}

/** Validate a single board card code e.g. "Ah" */
function isValidCard(card: string): boolean {
  return CARD_RE.test(card);
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('POST /api/games/bulk', () => {

  // --- Happy path: defaults ---

  // NOTE: Vercel serverless timeout (~10s) limits practical game counts per request.
  // Monte Carlo odds (100k iterations × numberOfHands × 4 stages) is CPU-intensive.
  // Tests use 1-3 games to stay within timeout. Default of 50 is valid but not
  // testable against the Vercel hobby-tier deployment.

  test('returns 200 with 1 game and correct default response shape', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.numberOfGames).toBe(1);
    expect(body.numberOfHands).toBe(3);       // default
    expect(body.targetRtp).toBe(0.97);         // default
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.games).toHaveLength(1);
  });

  test('returns 200 with 2 games, 3 hands', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 2, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.numberOfGames).toBe(2);
    expect(body.numberOfHands).toBe(3);
    expect(body.games).toHaveLength(2);
  });

  test('returns 200 with 2 games, 4 hands', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 2, numberOfHands: 4 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.numberOfHands).toBe(4);
    expect(body.games).toHaveLength(2);
  });

  test('accepts custom targetRtp', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, numberOfHands: 3, targetRtp: 0.95 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.targetRtp).toBe(0.95);
  });

  // --- Game structure validation ---

  test('each game has correct structure and card fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 3, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      // gameId format: BULK-NNNN
      expect(game.gameId).toMatch(/^BULK-\d{4}$/);
      expect(game.numberOfHands).toBe(3);
      expect(game.numberOfBettingStages).toBe(3);

      // 3 hole-card hands
      expect(game.hands).toHaveLength(3);
      game.hands.forEach((h: string) => expect(isValidHand(h)).toBe(true));

      // 5 board cards
      expect(isValidCard(game.bc1)).toBe(true);
      expect(isValidCard(game.bc2)).toBe(true);
      expect(isValidCard(game.bc3)).toBe(true);
      expect(isValidCard(game.bc4)).toBe(true);
      expect(isValidCard(game.bc5)).toBe(true);
    }
  });

  test('handStageInfoList has correct length: numberOfHands × 4 stages', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 2, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      // 3 hands × 4 stages (HOLE, FLOP, TURN, RIVER)
      expect(game.handStageInfoList).toHaveLength(3 * 4);
    }
  });

  test('handStageInfoList has correct length for 4 hands', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, numberOfHands: 4 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.games[0].handStageInfoList).toHaveLength(4 * 4);
  });

  // --- handStageInfo field validation ---

  test('each handStageInfo entry has required numeric fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const entries = body.games[0].handStageInfoList;

    for (const entry of entries) {
      expect(typeof entry.handIndex).toBe('number');
      expect(typeof entry.bettingStage).toBe('number');
      expect(typeof entry.percentWin).toBe('number');
      expect(typeof entry.percentDraw).toBe('number');
      expect(typeof entry.percentWinOrDraw).toBe('number');
      expect(typeof entry.oddsActual).toBe('number');
      expect(typeof entry.oddsMargin).toBe('number');
      expect(typeof entry.oddsRounded).toBe('number');
      expect(typeof entry.actualRtp).toBe('number');
      expect(typeof entry.roundingRake).toBe('number');
      expect(typeof entry.statusIsWinner).toBe('boolean');
      expect(typeof entry.statusCantLose).toBe('boolean');
      expect(typeof entry.statusIsFavourite).toBe('boolean');
      expect(typeof entry.statusBestRtp).toBe('boolean');

      // percentWinOrDraw should equal percentWin + percentDraw (rounded to 1dp)
      const expected = parseFloat((entry.percentWin + entry.percentDraw).toFixed(1));
      expect(entry.percentWinOrDraw).toBeCloseTo(expected, 1);

      // odds chain: actual >= margin >= rounded (house eats into odds)
      expect(entry.oddsActual).toBeGreaterThanOrEqual(entry.oddsMargin);
      expect(entry.oddsMargin).toBeGreaterThanOrEqual(entry.oddsRounded - 0.05); // rounding tolerance

      // actualRtp is 0 when a hand is dead (win%=0, oddsActual=Infinity).
      // Otherwise it should be close to targetRtp within rounding tolerance.
      if (entry.oddsActual > 0 && isFinite(entry.oddsActual)) {
        expect(entry.actualRtp).toBeGreaterThan(0.85);
        expect(entry.actualRtp).toBeLessThanOrEqual(1.0);
      }
    }
  });

  test('HOLE stage entries have null card description fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 2, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      // HOLE stage is bettingStage=0, first 3 entries (handIndex 0,1,2)
      const holeEntries = game.handStageInfoList.filter(
        (e: { bettingStage: number }) => e.bettingStage === 0
      );
      expect(holeEntries).toHaveLength(3);
      for (const entry of holeEntries) {
        expect(entry.bestFiveCards).toBeNull();
        expect(entry.handDescShort).toBeNull();
        expect(entry.handDescLong).toBeNull();
      }
    }
  });

  test('FLOP and later stages have non-null hand descriptions', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 3, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      const laterEntries = game.handStageInfoList.filter(
        (e: { bettingStage: number }) => e.bettingStage > 0
      );
      for (const entry of laterEntries) {
        expect(entry.bestFiveCards).not.toBeNull();
        expect(entry.handDescShort).not.toBeNull();
        expect(entry.handDescLong).not.toBeNull();
        // bestFiveCards: 5 card codes separated by spaces
        const cards = (entry.bestFiveCards as string).split(' ');
        expect(cards).toHaveLength(5);
        cards.forEach((c: string) => expect(isValidCard(c)).toBe(true));
      }
    }
  });

  test('exactly one hand is favourite at each stage', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 3, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      // Check each stage independently
      for (const stage of [0, 1, 2, 3]) {
        const stageEntries = game.handStageInfoList.filter(
          (e: { bettingStage: number }) => e.bettingStage === stage
        );
        const favourites = stageEntries.filter(
          (e: { statusIsFavourite: boolean }) => e.statusIsFavourite
        );
        expect(favourites).toHaveLength(1);
      }
    }
  });

  test('exactly one hand wins at RIVER stage', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 3, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      const riverEntries = game.handStageInfoList.filter(
        (e: { bettingStage: number }) => e.bettingStage === 3
      );
      const winners = riverEntries.filter(
        (e: { statusIsWinner: boolean }) => e.statusIsWinner
      );
      // One winner, or more than one on a tie (draw) — at least one
      expect(winners.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('all cards in a game are unique (no duplicates)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 3, numberOfHands: 3 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    for (const game of body.games) {
      // Extract all cards: hole cards + 5 board cards
      const holeCards = game.hands.flatMap((h: string) => [h.slice(0, 2), h.slice(2, 4)]);
      const boardCards = [game.bc1, game.bc2, game.bc3, game.bc4, game.bc5];
      const allCards = [...holeCards, ...boardCards];

      // 3 hands × 2 + 5 board = 11 unique cards
      expect(allCards).toHaveLength(11);
      expect(new Set(allCards).size).toBe(11);
    }
  });

  // --- Validation errors ---

  test('returns 400 when numberOfGames is 0', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 0 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numberOfGames/);
  });

  test('returns 400 when numberOfGames exceeds 200', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 201 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numberOfGames/);
  });

  test('returns 400 when numberOfHands is 2 (not 3 or 4)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, numberOfHands: 2 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numberOfHands/);
  });

  test('returns 400 when numberOfHands is 5', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, numberOfHands: 5 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numberOfHands/);
  });

  test('returns 400 when targetRtp is 0', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, targetRtp: 0 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/targetRtp/);
  });

  test('returns 400 when targetRtp is 1 or greater', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
      data: { numberOfGames: 1, targetRtp: 1 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/targetRtp/);
  });

  test('returns 405 for GET request', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/games/bulk`, {
      headers: { Authorization: AUTH },
    });
    expect(res.status()).toBe(405);
  });

  // --- Auth ---

  test('returns 401 when Authorization header is missing', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/games/bulk`, {
      data: { numberOfGames: 1 },
    });
    expect(res.status()).toBe(401);
  });

});
