/**
 * E2E smoke tests — Playwright
 *
 * These tests verify the game loads and renders without errors.
 * Canvas content cannot be inspected directly, so tests focus on:
 *   - Page loads without JS errors
 *   - Canvas element is present with non-zero dimensions
 *   - The game container exists
 *
 * Run after `npm run build` via `npm run test:e2e`.
 * Requires Playwright browsers: npx playwright install chromium
 */

import { test, expect } from '@playwright/test';

test.describe('HedgeEm Reference Client — smoke tests', () => {

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2_000); // allow Phaser to init

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

  test('page title is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Texas Hedge'Em/);
  });

});
