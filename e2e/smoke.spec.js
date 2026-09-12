import { test, expect } from '@playwright/test';

test('app loads and renders a page without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await expect(page.locator('#toolbar')).toBeVisible();
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.fill('#text-input', 'Hello Inkflow E2E test note.');
  await page.click('.btn-render');
  await expect(page.locator('.canvas-page').first()).toBeVisible();
  await expect(page.locator('#page-indicator')).toContainText('Page 1 of 1');
  expect(errors).toEqual([]);
});
