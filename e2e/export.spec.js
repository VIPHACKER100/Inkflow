import { test, expect } from '@playwright/test';

test('PNG export triggers a download', async ({ page }) => {
  await page.goto('/');
  await page.fill('#text-input', 'Export test note.');
  await page.click('.btn-render');
  await expect(page.locator('.canvas-page').first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[aria-label="Export as PNG image"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/inkflow-notes.*\.png$/);
});
