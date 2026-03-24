/**
 * Settings crash reproduction test
 * Tries to reproduce crash by dealing first, then changing settings.
 * Also tests the dat.GUI config panel which the old cog button used to open.
 *
 * Run with:
 *   node tests/settings-crash-repro.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'settings-crash');

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

  const allErrors = [];
  const allWarnings = [];
  const allLogs = [];

  // ── Test A: Open settings immediately, click every toggle ───────────────
  console.log('\n========== TEST A: Open panel immediately, click all toggles ==========');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    page.on('console', msg => {
      const e = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      allLogs.push('A: ' + e);
      if (msg.type() === 'error') { allErrors.push('A: ' + e); console.log('  ERROR:', e); }
    });
    page.on('pageerror', err => {
      const e = `PAGEERROR: ${err.message}\n${err.stack}`;
      allErrors.push('A: ' + e);
      console.error('  PAGE ERROR:', e);
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(4000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click settings button (game coords 64, 50)
    const sc = g2p(box, 64, 50);
    await page.mouse.click(sc.x, sc.y);
    await page.waitForTimeout(1000);
    await ss(page, 'A-01-panel-open');

    // The panel group is at game (512, 316).
    // Toggle button coordinates (game): group_x + btn_offset_x, group_y + btn_offset_y
    // Sound ON: offset (90, -264) → game (602, 52)
    // But the canvas is 1280x800 displaying a 1024x640 game — canvas fills window at 1280x800
    // Scale: x = 1280/1024 = 1.25, y = 800/640 = 1.25
    // So page coords = box.x + (game_x / 1024) * box.width

    const toggleTests = [
      { name: 'Sound MUTE',        gx: 512 + 158, gy: 316 + (-264) },
      { name: 'Sound ON',          gx: 512 + 90,  gy: 316 + (-264) },
      { name: 'Hands 2',           gx: 512 + 90,  gy: 316 + (-230) },
      { name: 'Hands 3',           gx: 512 + 130, gy: 316 + (-230) },
      { name: 'Hands 4',           gx: 512 + 170, gy: 316 + (-230) },
      { name: 'Demo ON',           gx: 512 + 90,  gy: 316 + (-180) },
      { name: 'Demo OFF',          gx: 512 + 145, gy: 316 + (-180) },
      { name: 'Demo Desc ON',      gx: 512 + 90,  gy: 316 + (-146) },
      { name: 'Demo Desc OFF',     gx: 512 + 145, gy: 316 + (-146) },
      { name: 'Hidden Odds ON',    gx: 512 + 90,  gy: 316 + (-112) },
      { name: 'Hidden Odds OFF',   gx: 512 + 145, gy: 316 + (-112) },
      { name: 'Info Bar ON',       gx: 512 + 90,  gy: 316 + (-78) },
      { name: 'Info Bar OFF',      gx: 512 + 145, gy: 316 + (-78) },
      { name: 'Last Win ON',       gx: 512 + 90,  gy: 316 + (-44) },
      { name: 'Last Win OFF',      gx: 512 + 145, gy: 316 + (-44) },
      { name: 'Bonus ON',          gx: 512 + 90,  gy: 316 + (-10) },
      { name: 'Bonus OFF',         gx: 512 + 145, gy: 316 + (-10) },
      { name: 'Bonus Val ON',      gx: 512 + 90,  gy: 316 + 24 },
      { name: 'Bonus Val OFF',     gx: 512 + 145, gy: 316 + 24 },
      { name: 'Payouts ON',        gx: 512 + 90,  gy: 316 + 58 },
      { name: 'Payouts OFF',       gx: 512 + 145, gy: 316 + 58 },
      { name: 'Prev Wager ON',     gx: 512 + 90,  gy: 316 + 92 },
      { name: 'Prev Wager OFF',    gx: 512 + 145, gy: 316 + 92 },
      { name: 'One Chip ON',       gx: 512 + 90,  gy: 316 + 126 },
      { name: 'One Chip OFF',      gx: 512 + 145, gy: 316 + 126 },
      { name: 'Hide Chips ON',     gx: 512 + 90,  gy: 316 + 160 },
      { name: 'Hide Chips OFF',    gx: 512 + 145, gy: 316 + 160 },
      { name: 'Equity ON',         gx: 512 + 90,  gy: 316 + 194 },
      { name: 'Equity OFF',        gx: 512 + 145, gy: 316 + 194 },
      { name: '3/4 Toggle ON',     gx: 512 + 90,  gy: 316 + 228 },
      { name: '3/4 Toggle OFF',    gx: 512 + 145, gy: 316 + 228 },
      { name: 'Debug ON',          gx: 512 + 90,  gy: 316 + 262 },
      { name: 'Debug OFF',         gx: 512 + 145, gy: 316 + 262 },
      { name: 'CLOSE',             gx: 512 + 0,   gy: 316 + (330 - 26) },
    ];

    let errorsBefore = allErrors.length;
    for (const t of toggleTests) {
      const pc = g2p(box, t.gx, t.gy);
      console.log(`  Clicking: ${t.name} at game(${t.gx}, ${t.gy}) → page(${pc.x.toFixed(0)}, ${pc.y.toFixed(0)})`);
      await page.mouse.click(pc.x, pc.y);
      await page.waitForTimeout(300);
      if (allErrors.length > errorsBefore) {
        console.log(`  *** ERROR after clicking ${t.name} ***`);
        await ss(page, `A-ERROR-${t.name.replace(/[^a-z0-9]/gi, '_')}`);
        errorsBefore = allErrors.length;
      }
    }

    await ss(page, 'A-02-after-all-toggles');
    await ctx.close();
  }

  // ── Test B: Deal first, then open settings ───────────────────────────────
  console.log('\n========== TEST B: Deal first, then settings ==========');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    page.on('console', msg => {
      const e = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      allLogs.push('B: ' + e);
      if (msg.type() === 'error') { allErrors.push('B: ' + e); console.log('  ERROR:', e); }
    });
    page.on('pageerror', err => {
      const e = `PAGEERROR: ${err.message}\n${err.stack}`;
      allErrors.push('B: ' + e);
      console.error('  PAGE ERROR B:', e);
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(4000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click Deal button (game 965, 440)
    const dealClick = g2p(box, 965, 440);
    console.log('  Clicking Deal button...');
    await page.mouse.click(dealClick.x, dealClick.y);
    await page.waitForTimeout(2000);
    await ss(page, 'B-01-after-deal');

    // Advance to flop
    await page.mouse.click(dealClick.x, dealClick.y);
    await page.waitForTimeout(500);
    await ss(page, 'B-02-after-flop');

    // Open settings during a hand
    const sc = g2p(box, 64, 50);
    console.log('  Opening settings during hand...');
    await page.mouse.click(sc.x, sc.y);
    await page.waitForTimeout(1000);
    await ss(page, 'B-03-settings-during-hand');

    // Try clicking Demo OFF (known to call ENABLE_DEMO_GAME = false)
    const demoOffClick = g2p(box, 512 + 145, 316 + (-180));
    console.log('  Clicking Demo OFF...');
    await page.mouse.click(demoOffClick.x, demoOffClick.y);
    await page.waitForTimeout(500);

    // Try Hands 2
    const hands2Click = g2p(box, 512 + 90, 316 + (-230));
    console.log('  Clicking Hands 2...');
    await page.mouse.click(hands2Click.x, hands2Click.y);
    await page.waitForTimeout(500);

    // Try Debug ON
    const debugOnClick = g2p(box, 512 + 90, 316 + 262);
    console.log('  Clicking Debug ON...');
    await page.mouse.click(debugOnClick.x, debugOnClick.y);
    await page.waitForTimeout(500);

    await ss(page, 'B-04-after-toggles');

    // Check state
    const state = await page.evaluate(() => {
      const r = {};
      try { r.ENABLE_DEMO_GAME = ENABLE_DEMO_GAME; } catch(e) { r.ENABLE_DEMO_GAME = 'ERR'; }
      try { r.NUMBER_OF_HANDS = NUMBER_OF_HANDS; } catch(e) { r.NUMBER_OF_HANDS = 'ERR'; }
      try { r.ENABLE_DEBUG = ENABLE_DEBUG; } catch(e) { r.ENABLE_DEBUG = 'ERR'; }
      return r;
    });
    console.log('  Game state after toggles:', JSON.stringify(state));

    await ctx.close();
  }

  // ── Test C: Check dat.GUI (old config button) ────────────────────────────
  console.log('\n========== TEST C: Check if dat.GUI exists (old config panel) ==========');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    page.on('console', msg => {
      const e = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      if (msg.type() === 'error') { allErrors.push('C: ' + e); console.log('  ERROR:', e); }
    });
    page.on('pageerror', err => {
      const e = `PAGEERROR: ${err.message}\n${err.stack}`;
      allErrors.push('C: ' + e);
      console.error('  PAGE ERROR C:', e);
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(4000);

    const guiCheck = await page.evaluate(() => {
      const r = {};
      try { r.datGUI = typeof dat !== 'undefined' ? 'exists' : 'MISSING'; } catch(e) { r.datGUI = 'ERROR'; }
      try { r.rcl = typeof rcl !== 'undefined' ? 'exists' : 'MISSING'; } catch(e) { r.rcl = 'ERROR'; }
      // Check which functions exist
      const fns = ['SettingsCreate', 'SettingsPreload', 'ShowSettingsPanel', 'HideSettingsPanel',
                   'ToggleSettingsPanel', '_stgRefreshStyles', '_stgSet', '_stgSetSound',
                   '_stgSetHands', '_stgSetDemo', 'UpdateSettingsPanelPosition'];
      r.functions = {};
      for (const fn of fns) {
        r.functions[fn] = typeof window[fn] === 'function' ? 'OK' : 'MISSING';
      }
      // Check if SettingsCreate was called (panel group should exist)
      r.settingsPanelGroup = typeof settingsPanelGroup !== 'undefined' && settingsPanelGroup !== null ? 'exists' : 'MISSING';
      r.settingsPanelOverlay = typeof settingsPanelOverlay !== 'undefined' && settingsPanelOverlay !== null ? 'exists' : 'MISSING';
      // Check config vars
      const vars = ['ENABLE_DEMO_GAME', 'NUMBER_OF_HANDS', 'ENABLE_DEBUG', 'SHOW_INFO_BAR',
                    'BONUS_ENABLED', 'TOGGLE_THREE_AND_FOUR_HANDED_GAMES'];
      r.vars = {};
      for (const v of vars) {
        try { r.vars[v] = window[v]; } catch(e) { r.vars[v] = 'ERR'; }
      }
      return r;
    });
    console.log('  Game environment check:', JSON.stringify(guiCheck, null, 2));

    await ctx.close();
  }

  // ── Final summary ────────────────────────────────────────────────────────
  console.log('\n========== FINAL SUMMARY ==========');
  console.log(`Total errors: ${allErrors.length}`);
  if (allErrors.length > 0) {
    console.log('\nErrors:');
    allErrors.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  } else {
    console.log('  No JavaScript errors or page errors detected across all test scenarios.');
  }

  const logPath = path.join(RESULTS_DIR, 'crash-repro-log.txt');
  fs.writeFileSync(logPath, [
    '=== ERRORS ===',
    ...allErrors,
    '',
    '=== ALL LOGS ===',
    ...allLogs,
  ].join('\n'));
  console.log(`\nLog saved: ${logPath}`);

  await browser.close();
})();
