/**
 * Diagnostic script: settings panel crash investigation
 * Targets http://localhost:8080 (Phaser 2 JS game — the v1 reference client)
 *
 * Run with:
 *   node tests/settings-diagnostic.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'settings-diag');

// Game design resolution — Phaser 2 scales the canvas
const GAME_W = 1024;
const GAME_H = 640;

fs.mkdirSync(RESULTS_DIR, { recursive: true });

async function screenshot(page, name) {
  const p = path.join(RESULTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  Screenshot: ${p}`);
}

function gameToPage(box, gx, gy) {
  return {
    x: box.x + (gx / GAME_W) * box.width,
    y: box.y + (gy / GAME_H) * box.height,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // ── Capture all console output ──────────────────────────────────────────
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(entry);
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log('  CONSOLE:', entry);
    }
  });

  page.on('pageerror', err => {
    const entry = `PAGEERROR: ${err.message}\nStack: ${err.stack}`;
    pageErrors.push(entry);
    console.error('  PAGE ERROR:', entry);
  });

  page.on('requestfailed', req => {
    console.log(`  REQUEST FAILED: ${req.failure()?.errorText} — ${req.url()}`);
  });

  // ── Step 1: Load the page ───────────────────────────────────────────────
  console.log('\n=== Step 1: Loading page ===');
  await page.goto(BASE_URL);
  await page.waitForTimeout(4000);
  await screenshot(page, '01-initial-load');
  console.log(`  Page errors so far: ${pageErrors.length}`);
  console.log(`  Console errors so far: ${consoleLogs.filter(l => l.startsWith('[ERROR]')).length}`);

  // ── Step 2: Find the canvas ─────────────────────────────────────────────
  console.log('\n=== Step 2: Locating canvas ===');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    console.error('  FATAL: canvas not found');
    await browser.close();
    process.exit(1);
  }
  console.log(`  Canvas box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);

  // ── Step 3: Click the settings (cog) button ─────────────────────────────
  // In landscape mode the settings button is at game coords (64, 50)
  console.log('\n=== Step 3: Clicking settings (cog) button at game (64, 50) ===');
  const settingsClick = gameToPage(box, 64, 50);
  console.log(`  Page coords: x=${settingsClick.x.toFixed(1)}, y=${settingsClick.y.toFixed(1)}`);

  await page.mouse.click(settingsClick.x, settingsClick.y);
  await page.waitForTimeout(1500);
  await screenshot(page, '02-after-settings-click');
  console.log(`  Page errors after settings click: ${pageErrors.length}`);

  // ── Step 4: Introspect the game state via JS ────────────────────────────
  console.log('\n=== Step 4: Checking game state via JS ===');
  const gameState = await page.evaluate(() => {
    const info = {};
    try { info.settingsPanelActive = typeof settingsPanelActive !== 'undefined' ? settingsPanelActive : 'UNDEFINED'; } catch(e) { info.settingsPanelActive = 'ERROR: ' + e.message; }
    try { info.settingsPanelGroupVisible = settingsPanelGroup ? settingsPanelGroup.visible : 'null'; } catch(e) { info.settingsPanelGroupVisible = 'ERROR: ' + e.message; }
    try { info.phaserVersion = Phaser ? Phaser.VERSION : 'undefined'; } catch(e) { info.phaserVersion = 'ERROR'; }
    try { info.myPhaserGame = typeof myPhaserGame !== 'undefined' ? 'exists' : 'UNDEFINED'; } catch(e) { info.myPhaserGame = 'ERROR'; }
    try { info.GAME_W = myPhaserGame.width; info.GAME_H = myPhaserGame.height; } catch(e) {}
    try { info.worldScale = { x: myPhaserGame.world.scale.x, y: myPhaserGame.world.scale.y }; } catch(e) {}
    try { info.tsgWidth = tsgWidth; info.tsgHeight = tsgHeight; } catch(e) {}
    try {
      // Check if buttonSettings exists
      if (typeof buttonSettings !== 'undefined' && buttonSettings) {
        info.buttonSettings = { x: buttonSettings.x, y: buttonSettings.y, visible: buttonSettings.visible, exists: true };
      } else {
        info.buttonSettings = 'not found or undefined';
      }
    } catch(e) { info.buttonSettings = 'ERROR: ' + e.message; }
    return info;
  });
  console.log('  Game state:', JSON.stringify(gameState, null, 2));

  // ── Step 5: Try triggering panel via JS directly ─────────────────────────
  console.log('\n=== Step 5: Triggering ShowSettingsPanel() directly via JS ===');
  const jsResult = await page.evaluate(() => {
    try {
      if (typeof ShowSettingsPanel === 'function') {
        ShowSettingsPanel();
        return { ok: true, settingsPanelActive: settingsPanelActive };
      } else {
        return { ok: false, reason: 'ShowSettingsPanel not a function' };
      }
    } catch(e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });
  console.log('  JS ShowSettingsPanel() result:', JSON.stringify(jsResult, null, 2));
  await page.waitForTimeout(1000);
  await screenshot(page, '03-after-js-show-panel');

  // ── Step 6: Click a toggle button (Sound ON) ────────────────────────────
  // The settings panel group is centred at (512, 316) in landscape.
  // Sound ON button is at y=-264 within the group → absolute y = 316 + (-264) = 52 ...
  // But "y" in Phaser 2 is world-y, not screen-y (canvas is scaled).
  // Sound ON button x offset = 90, absolute = 512 + 90 = 602, y = 316 + (-264) = 52
  console.log('\n=== Step 6: Clicking Sound ON toggle (game coords ~602, 52) ===');
  const soundOnClick = gameToPage(box, 602, 52);
  console.log(`  Page coords: x=${soundOnClick.x.toFixed(1)}, y=${soundOnClick.y.toFixed(1)}`);
  await page.mouse.click(soundOnClick.x, soundOnClick.y);
  await page.waitForTimeout(1000);
  await screenshot(page, '04-after-sound-on-click');
  console.log(`  Page errors after sound ON click: ${pageErrors.length}`);

  // ── Step 7: Try clicking via JS ─────────────────────────────────────────
  console.log('\n=== Step 7: Calling _stgSetSound(false) directly via JS ===');
  const soundResult = await page.evaluate(() => {
    try {
      if (typeof _stgSetSound === 'function') {
        _stgSetSound(false);
        return { ok: true };
      } else {
        return { ok: false, reason: '_stgSetSound not a function' };
      }
    } catch(e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });
  console.log('  JS _stgSetSound(false) result:', JSON.stringify(soundResult, null, 2));
  await page.waitForTimeout(500);
  await screenshot(page, '05-after-js-sound');

  // ── Step 8: Try _stgSet for a different setting ─────────────────────────
  console.log('\n=== Step 8: Calling _stgSet("SHOW_INFO_BAR", false) via JS ===');
  const stgResult = await page.evaluate(() => {
    try {
      if (typeof _stgSet === 'function') {
        _stgSet('SHOW_INFO_BAR', false);
        return { ok: true, SHOW_INFO_BAR: typeof SHOW_INFO_BAR !== 'undefined' ? SHOW_INFO_BAR : 'UNDEFINED' };
      } else {
        return { ok: false, reason: '_stgSet not a function' };
      }
    } catch(e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });
  console.log('  JS _stgSet result:', JSON.stringify(stgResult, null, 2));
  await page.waitForTimeout(500);
  await screenshot(page, '06-after-js-stgset');

  // ── Step 9: Try _stgSetHands ────────────────────────────────────────────
  console.log('\n=== Step 9: Calling _stgSetHands(2) via JS ===');
  const handsResult = await page.evaluate(() => {
    try {
      if (typeof _stgSetHands === 'function') {
        _stgSetHands(2);
        return { ok: true, NUMBER_OF_HANDS: typeof NUMBER_OF_HANDS !== 'undefined' ? NUMBER_OF_HANDS : 'UNDEFINED' };
      } else {
        return { ok: false, reason: '_stgSetHands not a function' };
      }
    } catch(e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });
  console.log('  JS _stgSetHands(2) result:', JSON.stringify(handsResult, null, 2));
  await page.waitForTimeout(500);

  // ── Step 10: Check if _stgRefreshStyles crashes ─────────────────────────
  console.log('\n=== Step 10: Calling _stgRefreshStyles() directly via JS ===');
  const refreshResult = await page.evaluate(() => {
    try {
      if (typeof _stgRefreshStyles === 'function') {
        _stgRefreshStyles();
        return { ok: true };
      } else {
        return { ok: false, reason: '_stgRefreshStyles not a function' };
      }
    } catch(e) {
      return { ok: false, error: e.message, stack: e.stack };
    }
  });
  console.log('  JS _stgRefreshStyles() result:', JSON.stringify(refreshResult, null, 2));
  await page.waitForTimeout(500);
  await screenshot(page, '07-after-refresh-styles');

  // ── Step 11: Check all toggle button variables exist ────────────────────
  console.log('\n=== Step 11: Checking all toggle button variables ===');
  const btnVars = await page.evaluate(() => {
    const vars = [
      'stgSoundOnBtn', 'stgSoundOffBtn',
      'stgHands2Btn', 'stgHands3Btn', 'stgHands4Btn',
      'stgDemoOnBtn', 'stgDemoOffBtn',
      'stgDemoDescOnBtn', 'stgDemoDescOffBtn',
      'stgHiddenOddsOnBtn', 'stgHiddenOddsOffBtn',
      'stgInfoBarOnBtn', 'stgInfoBarOffBtn',
      'stgLastWinOnBtn', 'stgLastWinOffBtn',
      'stgBonusOnBtn', 'stgBonusOffBtn',
      'stgBonusValOnBtn', 'stgBonusValOffBtn',
      'stgPayoutsOnBtn', 'stgPayoutsOffBtn',
      'stgPrevWagerOnBtn', 'stgPrevWagerOffBtn',
      'stgOneChipOnBtn', 'stgOneChipOffBtn',
      'stgHideChipsOnBtn', 'stgHideChipsOffBtn',
      'stgEquityOnBtn', 'stgEquityOffBtn',
      'stgToggle34OnBtn', 'stgToggle34OffBtn',
      'stgDebugOnBtn', 'stgDebugOffBtn',
    ];
    const result = {};
    for (const v of vars) {
      try {
        const val = window[v];
        result[v] = val == null ? 'NULL/UNDEFINED' : typeof val;
      } catch(e) {
        result[v] = 'ERROR: ' + e.message;
      }
    }
    return result;
  });
  const nullBtns = Object.entries(btnVars).filter(([,v]) => v === 'NULL/UNDEFINED');
  console.log('  Button variable status:');
  for (const [k,v] of Object.entries(btnVars)) {
    const mark = v === 'NULL/UNDEFINED' ? ' *** NULL ***' : '';
    console.log(`    ${k}: ${v}${mark}`);
  }
  if (nullBtns.length > 0) {
    console.log(`\n  WARNING: ${nullBtns.length} button variables are null/undefined: ${nullBtns.map(([k])=>k).join(', ')}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(`Total page errors: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    console.log('\nPage errors:');
    pageErrors.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  }

  const errLogs = consoleLogs.filter(l => l.startsWith('[ERROR]'));
  console.log(`\nConsole errors: ${errLogs.length}`);
  errLogs.forEach(e => console.log('  ', e));

  const warnLogs = consoleLogs.filter(l => l.startsWith('[WARNING]'));
  console.log(`\nConsole warnings: ${warnLogs.length}`);
  warnLogs.forEach(w => console.log('  ', w));

  console.log('\nAll console output:');
  consoleLogs.forEach(l => console.log('  ', l));

  // Save full log
  const logPath = path.join(RESULTS_DIR, 'full-log.txt');
  fs.writeFileSync(logPath, [
    '=== PAGE ERRORS ===',
    ...pageErrors,
    '',
    '=== ALL CONSOLE ===',
    ...consoleLogs,
    '',
    '=== GAME STATE (step 4) ===',
    JSON.stringify(gameState, null, 2),
    '',
    '=== BTN VARS (step 11) ===',
    JSON.stringify(btnVars, null, 2),
    '',
    '=== JS RESULTS ===',
    'ShowSettingsPanel:', JSON.stringify(jsResult),
    '_stgSetSound:', JSON.stringify(soundResult),
    '_stgSet:', JSON.stringify(stgResult),
    '_stgSetHands:', JSON.stringify(handsResult),
    '_stgRefreshStyles:', JSON.stringify(refreshResult),
  ].join('\n'));
  console.log(`\nFull log saved: ${logPath}`);

  await browser.close();
})();
