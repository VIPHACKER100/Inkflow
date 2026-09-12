import { test, expect } from '@playwright/test';

test('clean paper style renders without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.fill('#text-input', 'Clean mode note.\nAnswer: hidden row test\nMore text.');
  await page.click('.paper-btn[data-style="clean"]');
  await page.click('.btn-render');
  await expect(page.locator('.canvas-page').first()).toBeVisible();
  expect(errors).toEqual([]);
});
