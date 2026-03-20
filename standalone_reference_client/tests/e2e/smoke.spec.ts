/**
 * E2E smoke tests — Playwright
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('HedgeEm Reference Client — smoke tests', () => {

  test('page loads without console errors — capture all logs', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(`PAGEERROR: ${err.message}`));
    page.on('requestfailed', req => failedRequests.push(`FAILED: ${req.failure()?.errorText} — ${req.url()}`));
    page.on('request', req => {
      if (req.url().match(/\.(png|jpg|mp3|ogg)$/)) {
        console.log(`REQUEST: ${req.url()}`);
      }
    });
    page.on('response', resp => {
      if (resp.url().match(/\.(png|jpg|mp3|ogg)$/)) {
        console.log(`RESPONSE: ${resp.status()} ${resp.headers()['content-type']} — ${resp.url()}`);
      }
      if (!resp.ok() && resp.url().includes('localhost')) {
        failedRequests.push(`HTTP ${resp.status()} — ${resp.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3_000);

    console.log('=== Console output ===');
    logs.forEach(l => console.log(l));
    console.log('=== Failed network requests ===');
    failedRequests.forEach(r => console.log(r));
    console.log('=== End ===');

    expect(errors, `JS errors: ${errors.join('\n')}\nFailed requests: ${failedRequests.join('\n')}`).toHaveLength(0);
  });

  test('screenshot after load — inspect visually', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3_000);

    const screenshotPath = path.join('test-results', 'load-state.png');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  });

  test('screenshot after DEAL click', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') console.log(`[error] ${msg.text()}`); });

    await page.goto('/');
    await page.waitForTimeout(3_000);

    // Click somewhere near the centre-bottom where the deal button should be
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      // Deal button is at (width/2, height-60) in game coords — click canvas centre-bottom
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 70);
      await page.waitForTimeout(2_000);
    }

    const screenshotPath = path.join('test-results', 'after-deal.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    expect(errors).toHaveLength(0);
  });

  test('game container div is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-container')).toBeVisible();
  });

  test('Phaser canvas is rendered with non-zero dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2_000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

});
