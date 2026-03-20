/**
 * Playwright API tests for POST /api/deal
 *
 * Runs against the production Vercel deployment.
 * Base URL: https://hedgeem-v5.qeetoto.com
 *
 * To run:
 *   npx playwright test tests/api/deal.spec.ts
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://hedgeem-v5.qeetoto.com';
// Stub token — auth middleware accepts any non-empty Bearer token in stub mode
const AUTH = 'Bearer test-token';

test.describe('POST /api/deal', () => {

  test('returns 200 with 4 hands and pre-flop odds (default)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 4 },
    });

    expect(res.status()).toBe(200);

    const body = await res.json();

    // hands: 4 strings, each 4 chars (2 cards × 2 chars each e.g. "AcKd")
    expect(body.hands).toHaveLength(4);
    body.hands.forEach((h: string) => expect(h).toMatch(/^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/));

    // remainingDeck: 52 - (4 hands × 2 cards) = 44 cards
    expect(body.remainingDeck).toHaveLength(44);

    // handOdds: one entry per hand
    expect(body.handOdds).toHaveLength(4);

    // Exactly one hand should be marked IN_PLAY_FAVOURITE
    const favourites = body.handOdds.filter((o: { handStatus: string }) => o.handStatus === 'IN_PLAY_FAVOURITE');
    expect(favourites).toHaveLength(1);

    // Win% + draw% per hand sum should together account for ~100% of iterations.
    // Win% alone sums to less than 100 because ties reduce the wins bucket —
    // each tied iteration only adds to drawPercentage, not winPercentage.
    const totalWin: number = body.handOdds.reduce((sum: number, o: { winPercentage: number }) => sum + o.winPercentage, 0);
    const totalDraw: number = body.handOdds.reduce((sum: number, o: { drawPercentage: number }) => sum + o.drawPercentage, 0);
    expect(totalWin).toBeGreaterThan(70); // lower bound — ties reduce win sum
    expect(totalWin + totalDraw).toBeGreaterThan(90);

    // Each hand should have bettingStage=0 (HOLE) and a positive odds value
    body.handOdds.forEach((o: { bettingStage: number; odds: number; winPercentage: number }) => {
      expect(o.bettingStage).toBe(0);
      expect(o.odds).toBeGreaterThan(0);
      expect(o.winPercentage).toBeGreaterThan(0);
    });
  });

  test('returns 200 with 2 hands when numberOfHands=2', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 2 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hands).toHaveLength(2);
    expect(body.remainingDeck).toHaveLength(48); // 52 - 4
    expect(body.handOdds).toHaveLength(2);
  });

  test('returns 200 with 6 hands when numberOfHands=6', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 6 },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hands).toHaveLength(6);
    expect(body.remainingDeck).toHaveLength(40); // 52 - 12
  });

  test('returns 400 when numberOfHands is out of range', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 7 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/numberOfHands/);
  });

  test('returns 400 when numberOfHands is 1', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 1 },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 401 when Authorization header is missing', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      data: { numberOfHands: 4 },
    });
    expect(res.status()).toBe(401);
  });

  test('deals unique cards — no duplicates across hands and remaining deck', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/deal`, {
      headers: { Authorization: AUTH },
      data: { numberOfHands: 4 },
    });

    const body = await res.json();

    // Split each 4-char hand string into individual 2-char cards
    const dealtCards: string[] = body.hands.flatMap((h: string) => [h.slice(0, 2), h.slice(2, 4)]);
    const allCards = [...dealtCards, ...body.remainingDeck];

    // Should be exactly 52 unique cards
    expect(allCards).toHaveLength(52);
    expect(new Set(allCards).size).toBe(52);
  });

});
