/**
 * Two-handed game: verify only 2 hands are dealt (cards for hands 3 & 4 must be invisible)
 *
 * Run with:
 *   node tests/test_two_handed.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'two-handed');

const GAME_W = 1024;
const GAME_H = 640;

fs.mkdirSync(RESULTS_DIR, { recursive: true });

async function ss(page, name) {
  const p = path.join(RESULTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

function g2p(box, gx, gy) {
  return {
    x: box.x + (gx / GAME_W) * box.width,
    y: box.y + (gy / GAME_H) * box.height,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  console.log('\n========== Two-handed game: card visibility after deal ==========');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    // Set 2-handed mode via localStorage before loading the game
    await ctx.addInitScript(() => {
      localStorage.setItem('stg_NUMBER_OF_HANDS', '2');
    });

    const page = await ctx.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`  [ERROR] ${msg.text()}`);
    });

    await page.goto(BASE_URL);
    console.log('  Waiting for game to load...');
    await page.waitForTimeout(4000);
    await ss(page, '01-loaded');

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Verify NUMBER_OF_HANDS is 2
    const numHands = await page.evaluate(() => window.NUMBER_OF_HANDS);
    assert(numHands === 2, `NUMBER_OF_HANDS is 2 (got ${numHands})`);

    // Click Deal
    const dealBtn = g2p(box, 965, 440);
    console.log('  Clicking Deal...');
    await page.mouse.click(dealBtn.x, dealBtn.y);
    await page.waitForTimeout(3000); // wait for deal animation
    await ss(page, '02-after-deal');

    // Check card visibility via Phaser objects
    const cardVisibility = await page.evaluate(() => {
      if (typeof imgCard === 'undefined') return null;
      return Array.from({ length: 13 }, (_, i) => ({
        index: i,
        visible: imgCard[i] ? imgCard[i].visible : null
      }));
    });

    if (!cardVisibility) {
      console.log('  [WARN] imgCard not accessible — cannot check card visibility');
    } else {
      // Hand 1 cards (0,1) and Hand 2 cards (2,3) should be visible
      assert(cardVisibility[0].visible === true,  'Card 0 (hand 1) is visible');
      assert(cardVisibility[1].visible === true,  'Card 1 (hand 1) is visible');
      assert(cardVisibility[2].visible === true,  'Card 2 (hand 2) is visible');
      assert(cardVisibility[3].visible === true,  'Card 3 (hand 2) is visible');

      // Hand 3 cards (4,5) and Hand 4 cards (6,7) must NOT be visible
      assert(cardVisibility[4].visible === false, 'Card 4 (hand 3) is hidden');
      assert(cardVisibility[5].visible === false, 'Card 5 (hand 3) is hidden');
      assert(cardVisibility[6].visible === false, 'Card 6 (hand 4) is hidden');
      assert(cardVisibility[7].visible === false, 'Card 7 (hand 4) is hidden');

      console.log('\n  Card visibility detail:');
      cardVisibility.slice(0, 8).forEach(c =>
        console.log(`    imgCard[${c.index}].visible = ${c.visible}`)
      );
    }

    // Check imgHand visibility — only 2 should exist
    const handVisibility = await page.evaluate(() => {
      if (typeof imgHand === 'undefined') return null;
      return imgHand.map((h, i) => ({ index: i, visible: h ? h.visible : null }));
    });

    if (handVisibility) {
      assert(handVisibility.length === 2, `imgHand array has 2 entries (got ${handVisibility.length})`);
    }

    // Check that the underlying data is 3-handed (not 4-handed)
    const dataInfo = await page.evaluate(() => ({
      dataNumberOfHands: window.copyData && window.copyData[0] ? window.copyData[0].number_of_hands : -1,
      hand2oddsUndefined: typeof handOdds !== 'undefined' ? handOdds[2] === undefined : null,
    }));
    assert(dataInfo.dataNumberOfHands === 3, `Game data is 3-handed (got ${dataInfo.dataNumberOfHands})`);
    assert(dataInfo.hand2oddsUndefined === true, 'handOdds[2] is undefined (only 2 hands initialised)');

    await ctx.close();
  }

  await browser.close();

  console.log(`\n========== Results: ${passed} passed, ${failed} failed ==========`);
  process.exit(failed > 0 ? 1 : 0);
})();
