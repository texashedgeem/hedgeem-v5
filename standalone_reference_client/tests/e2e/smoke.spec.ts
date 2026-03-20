/**
 * E2E smoke tests — Playwright
 *
 * Deal button game coords: x=960, y=520 on 1024×640 canvas.
 * Playwright canvas coords = box.x + (game_x / 1024) * box.width, etc.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Game canvas design resolution
const GAME_W = 1024;
const GAME_H = 640;

/** Convert game coordinates to Playwright page coordinates given the canvas bounding box */
function gameToPage(box: { x: number; y: number; width: number; height: number }, gx: number, gy: number) {
  return {
    x: box.x + (gx / GAME_W) * box.width,
    y: box.y + (gy / GAME_H) * box.height,
  };
}

async function clickDealButton(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const { x, y } = gameToPage(box, 960, 520);
  await page.mouse.click(x, y);
}

async function clickAdvanceButton(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const { x, y } = gameToPage(box, 874, 290);
  await page.mouse.click(x, y);
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  const screenshotPath = path.join('test-results', `${name}.png`);
  fs.mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

test.describe('HedgeEm Reference Client — smoke tests', () => {

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(`PAGEERROR: ${err.message}`));
    page.on('requestfailed', req => failedRequests.push(`FAILED: ${req.failure()?.errorText} — ${req.url()}`));
    page.on('response', resp => {
      if (!resp.ok() && resp.url().includes('localhost')) {
        failedRequests.push(`HTTP ${resp.status()} — ${resp.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3_000);

    expect(errors, `JS errors: ${errors.join('\n')}\nFailed: ${failedRequests.join('\n')}`).toHaveLength(0);
  });

  test('game container and canvas present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-container')).toBeVisible();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('screenshot: initial load state (landscape desktop)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3_000);
    await saveScreenshot(page, 'load-landscape-desktop');
  });

  test('screenshot: after DEAL — hole stage (landscape desktop)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3_000);
    await clickDealButton(page);
    await page.waitForTimeout(2_000);
    await saveScreenshot(page, 'after-deal-hole-landscape');
    expect(errors).toHaveLength(0);
  });

  test('screenshot: full game cycle — deal → flop → turn → river (landscape desktop)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3_000);

    await clickDealButton(page);
    await page.waitForTimeout(1_500);
    await saveScreenshot(page, 'stage-hole');

    await clickAdvanceButton(page);
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'stage-flop');

    await clickAdvanceButton(page);
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'stage-turn');

    await clickAdvanceButton(page);
    await page.waitForTimeout(500);
    await saveScreenshot(page, 'stage-river');

    expect(errors).toHaveLength(0);
  });

  test('screenshot: initial load — mobile portrait (375×667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(3_000);
    await saveScreenshot(page, 'load-mobile-portrait');
  });

  test('screenshot: initial load — mobile landscape (667×375)', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/');
    await page.waitForTimeout(3_000);
    await saveScreenshot(page, 'load-mobile-landscape');
  });

  test('screenshot: initial load — tablet portrait (768×1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(3_000);
    await saveScreenshot(page, 'load-tablet-portrait');
  });

  // after-deal.png kept for backwards compat with existing visual review
  test('screenshot after DEAL click (legacy)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3_000);
    await clickDealButton(page);
    await page.waitForTimeout(2_000);
    await saveScreenshot(page, 'after-deal');
  });

});
