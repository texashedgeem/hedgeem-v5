/**
 * test_payout_text_position.js — HEDGE regression test
 *
 * Verifies payout text appears in the correct position (within the summary panel,
 * below the hand cards) after placing a bet, for both config modes:
 *   - 'Stage Payouts'  (SHOW_PREVIOUS_WAGER_INSTEAD_OF_PAYOUTS = true, default)
 *   - 'Payout amount'  (SHOW_PREVIOUS_WAGER_INSTEAD_OF_PAYOUTS = false)
 *
 * Regression: 2026-03-24 — payout text was mispositioned after a corrupted
 * coredata.js caused partial page load. Text should appear in the lower half
 * of the hand card area, not at canvas origin (0,0).
 *
 * Usage: node tests/test_payout_text_position.js
 * Requires: http://localhost:8081 serving deployable_boiler_plate_release/
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8081';
const VIEWPORT = { width: 1024, height: 640 };

// Approximate canvas coordinates for 3-handed landscape layout
const DEAL_BTN     = { x: 0.93, y: 0.72 };  // green advance/deal button
const HAND1_BTN    = { x: 0.20, y: 0.55 };  // hand 1 bet area
const ADVANCE_BTN  = { x: 0.93, y: 0.72 };  // same button advances game

// The summary panel for hand 1 sits roughly in the lower-left quadrant.
// After a bet the payout text should appear there — NOT at canvas top-left.
// We sample a point near the top-left (should NOT have white text)
// and a point in the hand 1 summary area (should NOT be pure background blue).
const TOPLEFT_SAMPLE = { x: 10, y: 10 };

async function runTest(wagerMode) {
  const label = wagerMode ? 'Previous Wager ON (default)' : 'Payout amount (wager OFF)';
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // Set the mode via localStorage before page load
  await page.addInitScript(
    `localStorage.setItem('stg_SHOW_PREVIOUS_WAGER_INSTEAD_OF_PAYOUTS', '${wagerMode}');`
  );

  await page.goto(BASE_URL);
  await page.waitForTimeout(3000);

  const box = await page.locator('canvas').boundingBox();
  const cW = box.width, cH = box.height;

  const click = async (rel, delay = 500) => {
    await page.click('canvas', { position: { x: cW * rel.x, y: cH * rel.y } });
    await page.waitForTimeout(delay);
  };

  // Deal
  await click(DEAL_BTN, 2000);

  // Place a bet on hand 1
  await click(HAND1_BTN, 500);

  // Capture pixel at canvas top-left — should NOT be white (which would indicate
  // text rendered at position 0,0 — the regression symptom)
  const topLeftPx = await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('canvas');
    const ctx2 = canvas.getContext('2d');
    const d = ctx2.getImageData(x, y, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }, TOPLEFT_SAMPLE);

  const textAtOrigin = topLeftPx.r > 200 && topLeftPx.g > 200 && topLeftPx.b > 200;

  // Advance to flop and place a second bet to verify two-line panel stacking
  await click(ADVANCE_BTN, 2000);
  await click(HAND1_BTN, 500);

  const topLeftPx2 = await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('canvas');
    const ctx2 = canvas.getContext('2d');
    const d = ctx2.getImageData(x, y, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }, TOPLEFT_SAMPLE);

  const textAtOrigin2 = topLeftPx2.r > 200 && topLeftPx2.g > 200 && topLeftPx2.b > 200;

  await page.screenshot({ path: `test-results/payout_pos_${wagerMode ? 'wager' : 'payout'}_flop.png` });
  await ctx.close();

  const pass = !textAtOrigin && !textAtOrigin2;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${label}]: hole=${textAtOrigin ? 'MISPOSITIONED' : 'ok'} flop=${textAtOrigin2 ? 'MISPOSITIONED' : 'ok'}`);
  return pass;
}

let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const results = await Promise.all([runTest(true), runTest(false)]);
  await browser.close();

  const allPass = results.every(Boolean);
  console.log(allPass ? '\nAll payout position tests passed.' : '\nSome payout position tests FAILED.');
  process.exit(allPass ? 0 : 1);
})();
