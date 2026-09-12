import { test, expect } from '@playwright/test';

test('long text paginates across pages', async ({ page }) => {
  await page.goto('/');
  const paragraph = 'The quick brown fox jumps over the lazy dog. ';
  await page.fill('#text-input', paragraph.repeat(120));
  await page.click('.btn-render');
  await expect(page.locator('#page-indicator')).toContainText(/Page 1 of [2-9]/);
  await expect(page.locator('#nav-next')).toBeEnabled();
  await page.click('#nav-next');
  await expect(page.locator('#page-indicator')).toContainText('Page 2 of');
});
