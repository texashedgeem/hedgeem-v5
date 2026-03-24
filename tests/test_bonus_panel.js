// HEDGE-109: Test bonus panel visibility fix
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Clear any stale localStorage before loading
    await page.goto('http://localhost:8080/odobo/');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check initial state
    const initial = await page.evaluate(() => ({
        imgBonusPanelVisible: imgBonusPanel.visible,
        BONUS_ENABLED: BONUS_ENABLED,
        SHOW_BONUS_VALUE: SHOW_BONUS_VALUE,
        starsVisible: imgStar.map(s => s.visible),
        BonusAmountTextVisible: BonusAmountText ? BonusAmountText.visible : 'N/A',
        BonusAmountTitleVisible: BonusAmountTitle ? BonusAmountTitle.visible : 'N/A',
        RefreshBonusPanelVisibility_exists: typeof RefreshBonusPanelVisibility === 'function',
    }));
    console.log('\n=== INITIAL STATE (all defaults) ===');
    console.log(JSON.stringify(initial, null, 2));

    // Toggle BONUS_ENABLED off via _stgSet
    await page.evaluate(() => _stgSet('BONUS_ENABLED', false));
    await page.waitForTimeout(300);

    const afterBonusOff = await page.evaluate(() => ({
        imgBonusPanelVisible: imgBonusPanel.visible,
        BONUS_ENABLED: BONUS_ENABLED,
        starsVisible: imgStar.map(s => s.visible),
        BonusAmountTextVisible: BonusAmountText ? BonusAmountText.visible : 'N/A',
        BonusAmountTitleVisible: BonusAmountTitle ? BonusAmountTitle.visible : 'N/A',
    }));
    console.log('\n=== AFTER _stgSet(BONUS_ENABLED, false) ===');
    console.log(JSON.stringify(afterBonusOff, null, 2));

    // Toggle SHOW_BONUS_VALUE off (BONUS_ENABLED still true baseline — reset first)
    await page.evaluate(() => _stgSet('BONUS_ENABLED', true));
    await page.evaluate(() => _stgSet('SHOW_BONUS_VALUE', false));
    await page.waitForTimeout(300);

    const afterShowOff = await page.evaluate(() => ({
        imgBonusPanelVisible: imgBonusPanel.visible,
        BONUS_ENABLED: BONUS_ENABLED,
        SHOW_BONUS_VALUE: SHOW_BONUS_VALUE,
        starsVisible: imgStar.map(s => s.visible),
        BonusAmountTextVisible: BonusAmountText ? BonusAmountText.visible : 'N/A',
    }));
    console.log('\n=== AFTER _stgSet(SHOW_BONUS_VALUE, false) [BONUS_ENABLED=true] ===');
    console.log(JSON.stringify(afterShowOff, null, 2));

    await browser.close();
})();
