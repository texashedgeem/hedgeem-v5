// test_settings_mobile.js — check settings panel on mobile viewport
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });

    // iPhone SE-ish portrait
    const portrait = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    const page = await portrait.newPage();
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(3000);

    // Screenshot: initial state
    await page.screenshot({ path: 'test-results/mobile_01_initial.png' });
    console.log('📸 01_initial');

    // Tap the settings cog — it's a Phaser canvas button so click by canvas coordinates
    // Settings button: landscape x=64,y=50 / portrait x=32,y=50 (game coords)
    // Canvas fills viewport; game is 640×1024 portrait design space
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    console.log('Canvas:', JSON.stringify(box));

    const scaleX = box.width  / 640;
    const scaleY = box.height / 1024;
    const cogX = box.x + 32 * scaleX;
    const cogY = box.y + 50 * scaleY;
    console.log(`Tapping cog at screen (${cogX.toFixed(0)}, ${cogY.toFixed(0)})`);
    await page.tap(`canvas`, { position: { x: 32 * scaleX, y: 50 * scaleY } });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/mobile_02_panel_open.png' });
    console.log('📸 02_panel_open');

    // Check panel is visible
    const panel = page.locator('#_stgPanel, div').filter({ hasText: 'SETTINGS' }).first();
    const panelVisible = await page.evaluate(() => {
        const els = document.querySelectorAll('div');
        for (const el of els) {
            if (el.textContent.includes('SETTINGS') && el.style.display !== 'none') return true;
        }
        return false;
    });
    console.log('Panel visible:', panelVisible ? '✅ YES' : '❌ NO');

    // Try toggling Hidden Odds ON
    const toggled = await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
            if (btn.textContent === 'ON') {
                // find the nearest parent row and check it's the Hidden Odds row
                const row = btn.closest('div[style*="border-bottom"]');
                if (row && row.textContent.includes('Hidden')) {
                    btn.click();
                    return true;
                }
            }
        }
        return false;
    });
    console.log('Hidden Odds ON tapped:', toggled ? '✅' : '❌ not found');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/mobile_03_hidden_odds_on.png' });
    console.log('📸 03_hidden_odds_on');

    // Close panel
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
            if (btn.textContent === 'CLOSE') { btn.click(); return; }
        }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/mobile_04_panel_closed.png' });
    console.log('📸 04_panel_closed');

    // Check debug overlay visible
    const debugVisible = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        if (!pre) return false;
        const overlay = pre.parentElement;
        return overlay && overlay.style.display !== 'none' && pre.textContent.trim().length > 0;
    });
    console.log('Debug overlay showing after close:', debugVisible ? '✅ YES' : '❌ NO');

    // --- Landscape test ---
    const landscape = await browser.newContext({
        viewport: { width: 667, height: 375 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    const page2 = await landscape.newPage();
    await page2.goto('http://localhost:8080/');
    await page2.waitForTimeout(3000);
    await page2.screenshot({ path: 'test-results/mobile_05_landscape_initial.png' });
    console.log('📸 05_landscape_initial');

    const box2 = await page2.locator('canvas').boundingBox();
    console.log('Landscape canvas:', JSON.stringify(box2));
    // Landscape: settings at x=64,y=50 in 1024×640 game space
    await page2.tap('canvas', { position: { x: 64 * (box2.width / 1024), y: 50 * (box2.height / 640) } });
    await page2.waitForTimeout(800);
    await page2.screenshot({ path: 'test-results/mobile_06_landscape_panel.png' });
    console.log('📸 06_landscape_panel');

    const panelVisible2 = await page2.evaluate(() => {
        const els = document.querySelectorAll('div');
        for (const el of els) {
            if (el.textContent.includes('SETTINGS') && el.style.display !== 'none') return true;
        }
        return false;
    });
    console.log('Landscape panel visible:', panelVisible2 ? '✅ YES' : '❌ NO');

    await browser.close();
    console.log('\nDone. Screenshots in test-results/mobile_*.png');
})();
